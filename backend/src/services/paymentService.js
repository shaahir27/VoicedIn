import pool from '../db/pool.js';
import { transformPayment } from '../utils/transformers.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export async function markAsPaid(userId, invoiceId, { paymentDate, method } = {}) {
    const date = paymentDate || new Date().toISOString().split('T')[0];
    const payMethod = method || 'Bank Transfer';

    // Get invoice
    const { rows: invRows } = await pool.query(
        'SELECT * FROM invoices WHERE id = $1 AND user_id = $2',
        [invoiceId, userId]
    );
    if (invRows.length === 0) throw new NotFoundError('Invoice');
    const invoice = invRows[0];

    if (invoice.status === 'paid') throw new ValidationError('Invoice is already paid');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update invoice status
        await client.query(
            `UPDATE invoices SET status = 'paid', paid_date = $1, is_draft = false WHERE id = $2`,
            [date, invoiceId]
        );

        // Create payment record
        const { rows } = await client.query(
            `INSERT INTO payment_records (user_id, invoice_id, invoice_number, client_name, amount, date, method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed') RETURNING *`,
            [userId, invoiceId, invoice.number, invoice.client_name, invoice.total, date, payMethod]
        );

        await client.query('COMMIT');
        return transformPayment(rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function markAsUnpaid(userId, invoiceId) {
    const { rows } = await pool.query(
        'SELECT * FROM invoices WHERE id = $1 AND user_id = $2',
        [invoiceId, userId]
    );
    if (rows.length === 0) throw new NotFoundError('Invoice');

    await pool.query(
        `UPDATE invoices SET status = 'unpaid', paid_date = NULL WHERE id = $1`,
        [invoiceId]
    );

    // Remove payment records for this invoice
    await pool.query('DELETE FROM payment_records WHERE invoice_id = $1', [invoiceId]);

    return { success: true };
}

export async function listPayments(userId, filters = {}) {
    let query = `
    SELECT pr.*, i.number as invoice_number, i.client_name
    FROM payment_records pr
    JOIN invoices i ON i.id = pr.invoice_id
    WHERE pr.user_id = $1
  `;
    const params = [userId];
    let idx = 2;

    if (filters.clientId) {
        query += ` AND i.client_id = $${idx++}`;
        params.push(filters.clientId);
    }
    if (filters.dateFrom) {
        query += ` AND pr.date >= $${idx++}`;
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        query += ` AND pr.date <= $${idx++}`;
        params.push(filters.dateTo);
    }

    query += ' ORDER BY pr.date DESC';

    const { rows } = await pool.query(query, params);
    return rows.map(transformPayment);
}

export async function getAlerts(userId) {
    // Overdue invoices
    const { rows: overdue } = await pool.query(
        `SELECT * FROM invoices WHERE user_id = $1 AND status IN ('overdue') ORDER BY due_date ASC`,
        [userId]
    );

    // Due within 3 days
    const { rows: dueSoon } = await pool.query(
        `SELECT * FROM invoices WHERE user_id = $1 AND status = 'unpaid'
     AND due_date IS NOT NULL AND due_date <= CURRENT_DATE + INTERVAL '3 days' AND due_date >= CURRENT_DATE
     ORDER BY due_date ASC`,
        [userId]
    );

    return {
        overdue: overdue.map(r => ({
            id: r.id,
            number: r.number,
            clientName: r.client_name,
            total: Number(r.total),
            dueDate: r.due_date?.toISOString?.()?.split('T')[0] || r.due_date,
            status: 'overdue',
        })),
        dueSoon: dueSoon.map(r => ({
            id: r.id,
            number: r.number,
            clientName: r.client_name,
            total: Number(r.total),
            dueDate: r.due_date?.toISOString?.()?.split('T')[0] || r.due_date,
            status: 'unpaid',
        })),
    };
}

export async function getClientPayments(userId, clientId) {
    const { rows } = await pool.query(`
    SELECT pr.*, i.number as invoice_number, i.client_name
    FROM payment_records pr
    JOIN invoices i ON i.id = pr.invoice_id
    WHERE pr.user_id = $1 AND i.client_id = $2
    ORDER BY pr.date DESC
  `, [userId, clientId]);
    return rows.map(transformPayment);
}
