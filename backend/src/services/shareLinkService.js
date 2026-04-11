import crypto from 'crypto';
import pool from '../db/pool.js';
import { transformInvoice } from '../utils/transformers.js';
import { NotFoundError, AppError } from '../utils/errors.js';

export async function createShareLink(userId, { dateFrom, dateTo, clientId } = {}) {
    const token = crypto.randomBytes(32).toString('hex');

    const { rows } = await pool.query(
        `INSERT INTO share_links (user_id, token, date_from, date_to, client_id, is_active)
     VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
        [userId, token, dateFrom || null, dateTo || null, clientId || null]
    );

    return {
        id: rows[0].id,
        token,
        url: `/share/${token}`,
        dateFrom, dateTo,
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
    let query = 'SELECT * FROM invoices WHERE user_id = $1';
    const params = [link.user_id];
    let idx = 2;

    if (link.date_from) {
        query += ` AND date >= $${idx++}`;
        params.push(link.date_from);
    }
    if (link.date_to) {
        query += ` AND date <= $${idx++}`;
        params.push(link.date_to);
    }
    if (link.client_id) {
        query += ` AND client_id = $${idx++}`;
        params.push(link.client_id);
    }

    query += ` AND status != 'draft' ORDER BY date DESC`;

    const { rows: invoices } = await pool.query(query, params);

    return {
        sharedBy: link.user_name,
        dateRange: { from: link.date_from, to: link.date_to },
        invoices: invoices.map(transformInvoice),
        total: invoices.reduce((s, i) => s + Number(i.total), 0),
        count: invoices.length,
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
        isActive: r.is_active,
        createdAt: r.created_at,
    }));
}
