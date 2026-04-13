import pool from '../db/pool.js';
import { transformInvoice, transformInvoiceItem } from '../utils/transformers.js';
import { NotFoundError, ValidationError, AppError } from '../utils/errors.js';
import { validateRequired, validateInvoiceItems, validateGST, validateEmail, validatePhone } from '../utils/validators.js';
import { getNextNumber } from './invoiceNumberService.js';

export async function createInvoice(userId, data, isDemo = false) {
    const status = data.isDraft || data.status === 'draft' ? 'draft' : (data.status || 'unpaid');
    const isDraft = status === 'draft';
    const clientName = (data.clientName || '').trim() || (isDraft ? 'Draft client' : '');

    if (isDraft) {
        validateRequired(['date'], data);
    } else {
        validateRequired(['clientName', 'date'], { ...data, clientName });
    }

    const rawItems = Array.isArray(data.items) ? data.items : [];
    const items = isDraft
        ? rawItems.filter(item => item.description?.trim() && Number(item.qty) > 0 && Number(item.rate) >= 0)
        : rawItems;
    if (!isDraft) validateInvoiceItems(items);

    // Demo restriction: max 3 invoices
    if (isDemo) {
        const { rows } = await pool.query('SELECT COUNT(*) as cnt FROM invoices WHERE user_id = $1', [userId]);
        if (parseInt(rows[0].cnt) >= 3) {
            throw new AppError('Demo is limited to 3 invoices. Upgrade to Premium for unlimited invoices.', 403);
        }
    }

    const number = data.number || await getNextNumber(userId);

    // Compute totals server-side
    let subtotal = 0;
    let taxTotal = 0;
    for (const item of items) {
        const lineSubtotal = item.qty * item.rate;
        const lineTax = lineSubtotal * (item.tax || 0) / 100;
        subtotal += lineSubtotal;
        taxTotal += lineTax;
    }
    const total = subtotal + taxTotal;

    const company = (data.company || data.companyName || data.company_name || '').trim();
    const clientCompanyName = (data.clientCompanyName || data.companyName || data.company_name || company || '').trim();
    const rawClientGstNumber = (data.clientGstNumber || data.gstNumber || data.gst_number || '').trim();
    const clientGstNumber = rawClientGstNumber ? validateGST(rawClientGstNumber) : '';
    const clientAddress = (data.clientAddress || data.address || '').trim();
    const rawClientEmail = (data.clientEmail || data.email || '').trim();
    const clientEmail = rawClientEmail ? validateEmail(rawClientEmail) : '';
    const rawClientPhone = (data.clientPhone || data.phone || '').trim();
    const clientPhone = rawClientPhone ? validatePhone(rawClientPhone) : '';
    const includeBankDetails = await resolveIncludeBankDetails(userId, data.includeBankDetails);

    if (!isDraft) {
        if (!clientCompanyName) throw new ValidationError('Client company name is required');
        if (!clientGstNumber) throw new ValidationError('Client GST number is required');
        if (!clientAddress) throw new ValidationError('Client address is required');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `INSERT INTO invoices (user_id, client_id, number, client_name, company, client_company_name, client_gst_number, client_address, status, date, due_date, subtotal, tax_total, total, notes, terms, template, currency, is_draft, include_bank_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
            [userId, data.clientId || null, number, clientName, company, clientCompanyName, clientGstNumber, clientAddress, status, data.date, data.dueDate || null, subtotal, taxTotal, total, data.notes || '', data.terms || '', data.template || 'modern', data.currency || 'INR', isDraft, includeBankDetails]
        );
        const invoice = rows[0];

        // Insert items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const lineSubtotal = item.qty * item.rate;
            const lineTax = lineSubtotal * (item.tax || 0) / 100;
            const lineTotal = lineSubtotal + lineTax;
            await client.query(
                `INSERT INTO invoice_items (invoice_id, description, qty, rate, tax, line_total, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [invoice.id, item.description, item.qty, item.rate, item.tax || 0, lineTotal, i]
            );
        }

        if (!data.clientId && clientName && clientName !== 'Draft client' && clientCompanyName && clientGstNumber && clientAddress) {
            const clientId = await findOrCreateClientForInvoice(client, userId, {
                name: clientName,
                company: clientCompanyName,
                gst: clientGstNumber,
                address: clientAddress,
                email: clientEmail || null,
                phone: clientPhone || null,
            });
            await client.query('UPDATE invoices SET client_id = $1 WHERE id = $2', [clientId, invoice.id]);
        }

        await client.query('COMMIT');

        // Fetch with items
        return await getInvoice(userId, invoice.id);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function updateInvoice(userId, invoiceId, data) {
    const isDraft = data.isDraft || data.status === 'draft';
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Recompute if items changed
        let subtotal, taxTotal, total;
        if (data.items) {
            const items = isDraft
                ? data.items.filter(item => item.description?.trim() && Number(item.qty) > 0 && Number(item.rate) >= 0)
                : data.items;
            if (!isDraft) validateInvoiceItems(items);
            subtotal = 0;
            taxTotal = 0;
            for (const item of items) {
                const lineSubtotal = item.qty * item.rate;
                const lineTax = lineSubtotal * (item.tax || 0) / 100;
                subtotal += lineSubtotal;
                taxTotal += lineTax;
            }
            total = subtotal + taxTotal;

            // Replace items
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const lineSubtotal = item.qty * item.rate;
                const lineTax = lineSubtotal * (item.tax || 0) / 100;
                const lineTotal = lineSubtotal + lineTax;
                await client.query(
                    `INSERT INTO invoice_items (invoice_id, description, qty, rate, tax, line_total, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                    [invoiceId, item.description, item.qty, item.rate, item.tax || 0, lineTotal, i]
                );
            }
        }

        const { rows } = await client.query(
            `UPDATE invoices SET
         client_id = COALESCE($1, client_id),
         client_name = COALESCE($2, client_name),
         company = COALESCE($3, company),
         client_company_name = COALESCE($4, client_company_name),
         client_gst_number = COALESCE($5, client_gst_number),
         client_address = COALESCE($6, client_address),
         status = COALESCE($7, status),
         date = COALESCE($8, date),
         due_date = COALESCE($9, due_date),
         paid_date = COALESCE($10, paid_date),
         subtotal = COALESCE($11, subtotal),
         tax_total = COALESCE($12, tax_total),
         total = COALESCE($13, total),
         notes = COALESCE($14, notes),
         terms = COALESCE($15, terms),
         template = COALESCE($16, template),
         is_draft = COALESCE($17, is_draft),
         include_bank_details = COALESCE($18, include_bank_details)
       WHERE id = $19 AND user_id = $20 RETURNING *`,
            [data.clientId, data.clientName, data.company, data.clientCompanyName, data.clientGstNumber, data.clientAddress, data.status, data.date, data.dueDate, data.paidDate, subtotal, taxTotal, total, data.notes, data.terms, data.template, data.isDraft, data.includeBankDetails, invoiceId, userId]
        );
        if (rows.length === 0) throw new NotFoundError('Invoice');

        await client.query('COMMIT');
        return await getInvoice(userId, invoiceId);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function getInvoice(userId, invoiceId) {
    const { rows } = await pool.query(
        `SELECT i.*, c.company_name AS client_company_name, c.gst_number AS client_gst_number, c.address AS client_address
         FROM invoices i
         LEFT JOIN clients c ON c.id = i.client_id
         WHERE i.id = $1 AND i.user_id = $2`,
        [invoiceId, userId]
    );
    if (rows.length === 0) throw new NotFoundError('Invoice');

    const { rows: items } = await pool.query(
        'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order',
        [invoiceId]
    );

    const invoice = transformInvoice(rows[0]);
    invoice.items = items.map(transformInvoiceItem);
    return invoice;
}

export async function listInvoices(userId, filters = {}) {
    let query = `
      SELECT i.*, c.company_name AS client_company_name, c.gst_number AS client_gst_number, c.address AS client_address
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.user_id = $1
    `;
    const params = [userId];
    let paramIdx = 2;

    if (filters.status) {
        query += ` AND i.status = $${paramIdx++}`;
        params.push(filters.status);
    }
    if (filters.clientId) {
        query += ` AND i.client_id = $${paramIdx++}`;
        params.push(filters.clientId);
    }
    if (filters.dateFrom) {
        query += ` AND i.date >= $${paramIdx++}`;
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        query += ` AND i.date <= $${paramIdx++}`;
        params.push(filters.dateTo);
    }
    if (filters.search) {
        query += ` AND (i.number ILIKE $${paramIdx} OR i.client_name ILIKE $${paramIdx} OR c.company_name ILIKE $${paramIdx} OR c.gst_number ILIKE $${paramIdx} OR c.address ILIKE $${paramIdx})`;
        params.push(`%${filters.search}%`);
        paramIdx++;
    }

    // Auto-detect overdue
    query += ` ORDER BY ${filters.sort === 'amount' ? 'i.total' : filters.sort === 'client' ? 'i.client_name' : 'i.date'} ${filters.order === 'asc' ? 'ASC' : 'DESC'}`;

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    // Get items for each invoice
    const invoices = [];
    for (const row of rows) {
        const { rows: items } = await pool.query(
            'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order',
            [row.id]
        );
        const inv = transformInvoice(row);
        inv.items = items.map(transformInvoiceItem);
        invoices.push(inv);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM invoices WHERE user_id = $1`;
    const { rows: countRows } = await pool.query(countQuery, [userId]);

    return { invoices, total: parseInt(countRows[0].total), page, limit };
}

export async function deleteInvoice(userId, invoiceId) {
    const { rowCount } = await pool.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2', [invoiceId, userId]);
    if (rowCount === 0) throw new NotFoundError('Invoice');
    return { success: true };
}

export async function updateInvoiceStatus(userId, invoiceId, status) {
    const validStatuses = ['draft', 'unpaid', 'paid', 'overdue'];
    if (!validStatuses.includes(status)) throw new ValidationError('Invalid status');

    const updates = { status };
    if (status === 'paid') {
        updates.paid_date = new Date().toISOString().split('T')[0];
        updates.is_draft = false;
    }
    if (status === 'unpaid') {
        updates.paid_date = null;
    }

    const { rows } = await pool.query(
        `UPDATE invoices SET status = $1, paid_date = $2, is_draft = $3
     WHERE id = $4 AND user_id = $5 RETURNING *`,
        [updates.status, updates.paid_date || null, updates.is_draft || false, invoiceId, userId]
    );
    if (rows.length === 0) throw new NotFoundError('Invoice');
    return transformInvoice(rows[0]);
}

export async function duplicateInvoice(userId, invoiceId) {
    const original = await getInvoice(userId, invoiceId);
    const newNumber = await getNextNumber(userId);

    const newInvoice = await createInvoice(userId, {
        clientId: original.clientId,
        clientName: original.clientName,
        company: original.company,
        clientCompanyName: original.clientCompanyName,
        clientGstNumber: original.clientGstNumber,
        clientAddress: original.clientAddress,
        date: new Date().toISOString().split('T')[0],
        dueDate: null,
        items: original.items.map(i => ({ description: i.description, qty: i.qty, rate: i.rate, tax: i.tax })),
        notes: original.notes,
        terms: original.terms,
        template: original.template,
        isDraft: true,
        includeBankDetails: original.includeBankDetails,
        number: newNumber,
    });
    return newInvoice;
}

async function findOrCreateClientForInvoice(client, userId, data) {
    const { rows: existingClients } = await client.query(
        `SELECT id
         FROM clients
         WHERE user_id = $1
           AND (LOWER(name) = LOWER($2) OR gst_number = $3 OR gst = $3)
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, data.name, data.gst]
    );

    if (existingClients.length > 0) {
        const clientId = existingClients[0].id;
        await client.query(
            `UPDATE clients SET
                company_name = COALESCE(NULLIF(company_name, ''), $2),
                company = COALESCE(NULLIF(company, ''), $2),
                gst_number = COALESCE(NULLIF(gst_number, ''), $3),
                gst = COALESCE(NULLIF(gst, ''), $3),
                address = COALESCE(NULLIF(address, ''), $4),
                email = COALESCE(email, $5),
                phone = COALESCE(phone, $6)
             WHERE id = $1`,
            [clientId, data.company, data.gst, data.address, data.email, data.phone]
        );
        return clientId;
    }

    const { rows } = await client.query(
        `INSERT INTO clients (user_id, name, email, phone, company_name, gst_number, company, gst, address, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $5, $6, $7, $8)
         RETURNING id`,
        [userId, data.name, data.email, data.phone, data.company, data.gst, data.address, 'Created from invoice']
    );

    return rows[0].id;
}

async function resolveIncludeBankDetails(userId, includeBankDetails) {
    if (typeof includeBankDetails === 'boolean') {
        return includeBankDetails;
    }

    const { rows } = await pool.query(
        'SELECT include_bank_details FROM business_profiles WHERE user_id = $1',
        [userId]
    );
    return Boolean(rows[0]?.include_bank_details);
}

export async function getLastInvoiceForClient(userId, clientId) {
    const { rows } = await pool.query(
        `SELECT i.*, c.company_name AS client_company_name, c.gst_number AS client_gst_number, c.address AS client_address
         FROM invoices i
         LEFT JOIN clients c ON c.id = i.client_id
         WHERE i.user_id = $1 AND i.client_id = $2 ORDER BY i.created_at DESC LIMIT 1`,
        [userId, clientId]
    );
    if (rows.length === 0) return null;

    const { rows: items } = await pool.query(
        'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order',
        [rows[0].id]
    );
    const inv = transformInvoice(rows[0]);
    inv.items = items.map(transformInvoiceItem);
    return inv;
}

// Auto-mark overdue invoices (can be called periodically)
export async function markOverdueInvoices() {
    await pool.query(
        `UPDATE invoices SET status = 'overdue'
     WHERE status = 'unpaid' AND due_date < CURRENT_DATE AND due_date IS NOT NULL`
    );
}
