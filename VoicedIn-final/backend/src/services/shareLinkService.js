import crypto from 'crypto';
import pool from '../db/pool.js';
import { transformInvoice } from '../utils/transformers.js';
import { NotFoundError, AppError } from '../utils/errors.js';

export async function createShareLink(userId, { dateFrom, dateTo, clientId, invoiceId } = {}) {
    if (invoiceId) {
        const { rows: invoiceRows } = await pool.query(
            'SELECT id FROM invoices WHERE id = $1 AND user_id = $2',
            [invoiceId, userId]
        );
        if (invoiceRows.length === 0) throw new NotFoundError('Invoice');

        const { rows: existingLinks } = await pool.query(
            `SELECT * FROM share_links
             WHERE user_id = $1 AND invoice_id = $2 AND is_active = true
             ORDER BY created_at DESC LIMIT 1`,
            [userId, invoiceId]
        );
        if (existingLinks.length > 0) {
            const existing = existingLinks[0];
            return {
                id: existing.id,
                token: existing.token,
                url: `/share/${existing.token}`,
                invoiceId: existing.invoice_id,
                createdAt: existing.created_at,
            };
        }
    }

    const token = crypto.randomBytes(32).toString('hex');

    const { rows } = await pool.query(
        `INSERT INTO share_links (user_id, token, date_from, date_to, client_id, invoice_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
        [userId, token, dateFrom || null, dateTo || null, clientId || null, invoiceId || null]
    );

    return {
        id: rows[0].id,
        token,
        url: `/share/${token}`,
        dateFrom,
        dateTo,
        clientId: rows[0].client_id,
        invoiceId: rows[0].invoice_id,
        createdAt: rows[0].created_at,
    };
}

export async function getShareLinkData(token) {
    const { rows } = await pool.query(
        `SELECT sl.*, u.name as user_name
     FROM share_links sl
     JOIN users u ON u.id = sl.user_id
     WHERE sl.token = $1 AND sl.is_active = true`,
        [token]
    );
    if (rows.length === 0) throw new NotFoundError('Share link');

    const link = rows[0];

    // Check expiry
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
        throw new AppError('This share link has expired', 410);
    }

    // Fetch invoices matching the link criteria
    let query = `
      SELECT i.*, c.company_name AS client_company_name, c.gst_number AS client_gst_number, c.address AS client_address
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.user_id = $1
    `;
    const params = [link.user_id];
    let idx = 2;

    if (link.invoice_id) {
        query += ` AND i.id = $${idx++}`;
        params.push(link.invoice_id);
    }
    if (link.date_from) {
        query += ` AND i.date >= $${idx++}`;
        params.push(link.date_from);
    }
    if (link.date_to) {
        query += ` AND i.date <= $${idx++}`;
        params.push(link.date_to);
    }
    if (link.client_id) {
        query += ` AND i.client_id = $${idx++}`;
        params.push(link.client_id);
    }

    if (!link.invoice_id) {
        query += ` AND i.status != 'draft'`;
    }
    query += ` ORDER BY i.date DESC`;

    const { rows: invoices } = await pool.query(query, params);
    const transformedInvoices = [];
    for (const invoiceRow of invoices) {
        const invoice = transformInvoice(invoiceRow);
        const { rows: items } = await pool.query(
            'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order',
            [invoice.id]
        );
        invoice.items = items.map(item => ({
            id: item.id,
            description: item.description,
            qty: Number(item.qty),
            rate: Number(item.rate),
            tax: Number(item.tax),
            lineTotal: Number(item.line_total),
        }));
        transformedInvoices.push(invoice);
    }

    return {
        sharedBy: link.user_name,
        dateRange: { from: link.date_from, to: link.date_to },
        invoice: link.invoice_id ? transformedInvoices[0] || null : null,
        invoices: transformedInvoices,
        total: invoices.reduce((s, i) => s + Number(i.total), 0),
        count: invoices.length,
        invoiceId: link.invoice_id,
    };
}

export async function revokeShareLink(userId, linkId) {
    const { rowCount } = await pool.query(
        'UPDATE share_links SET is_active = false WHERE id = $1 AND user_id = $2',
        [linkId, userId]
    );
    if (rowCount === 0) throw new NotFoundError('Share link');
    return { success: true };
}

export async function listShareLinks(userId) {
    const { rows } = await pool.query(
        'SELECT * FROM share_links WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    );
    return rows.map(r => ({
        id: r.id,
        token: r.token,
        url: `/share/${r.token}`,
        dateFrom: r.date_from,
        dateTo: r.date_to,
        clientId: r.client_id,
        invoiceId: r.invoice_id,
        isActive: r.is_active,
        createdAt: r.created_at,
    }));
}
