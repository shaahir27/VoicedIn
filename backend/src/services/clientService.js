import pool from '../db/pool.js';
import { transformClient } from '../utils/transformers.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateGST } from '../utils/validators.js';

function pickClientCompany(data) {
    return data.companyName ?? data.company_name ?? data.company ?? null;
}

function pickClientGst(data) {
    return data.gstNumber ?? data.gst_number ?? data.gst ?? null;
}

export async function listClients(userId, { search } = {}) {
    let query = `
    SELECT c.*,
      COALESCE(inv_stats.total_invoices, 0) as total_invoices,
      COALESCE(inv_stats.total_revenue, 0) as total_revenue,
      COALESCE(inv_stats.outstanding, 0) as outstanding
    FROM clients c
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN i.status IN ('unpaid', 'overdue') THEN i.total ELSE 0 END), 0) as outstanding
      FROM invoices i WHERE i.client_id = c.id
    ) inv_stats ON true
    WHERE c.user_id = $1
  `;
    const params = [userId];

    if (search) {
        params.push(`%${search}%`);
        query += ` AND (
          c.name ILIKE $${params.length}
          OR c.company_name ILIKE $${params.length}
          OR c.company ILIKE $${params.length}
          OR c.gst_number ILIKE $${params.length}
          OR c.gst ILIKE $${params.length}
          OR c.email ILIKE $${params.length}
        )`;
    }

    query += ' ORDER BY c.created_at DESC';
    const { rows } = await pool.query(query, params);
    return rows.map(transformClient);
}

export async function getClient(userId, clientId) {
    const { rows } = await pool.query(`
    SELECT c.*,
      COALESCE(inv_stats.total_invoices, 0) as total_invoices,
      COALESCE(inv_stats.total_revenue, 0) as total_revenue,
      COALESCE(inv_stats.outstanding, 0) as outstanding
    FROM clients c
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN i.status IN ('unpaid', 'overdue') THEN i.total ELSE 0 END), 0) as outstanding
      FROM invoices i WHERE i.client_id = c.id
    ) inv_stats ON true
    WHERE c.id = $1 AND c.user_id = $2
  `, [clientId, userId]);

    if (rows.length === 0) throw new NotFoundError('Client');
    return transformClient(rows[0]);
}

export async function createClient(userId, data) {
    validateRequired(['name'], data);
    const company = (pickClientCompany(data) || '').trim();
    const rawGst = (pickClientGst(data) || '').trim();
    const gst = rawGst ? validateGST(rawGst) : '';
    const address = (data.address || '').trim();

    if (!company) throw new ValidationError('Company name is required');
    if (!gst) throw new ValidationError('GST number is required');
    if (!address) throw new ValidationError('Address is required');

    const { rows } = await pool.query(
        `INSERT INTO clients (user_id, name, email, phone, company_name, gst_number, company, gst, address, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
            userId,
            data.name.trim(),
            data.email || null,
            data.phone || null,
            company,
            gst,
            company,
            gst,
            address,
            data.notes || null,
        ]
    );
    return transformClient({ ...rows[0], total_invoices: 0, total_revenue: 0, outstanding: 0 });
}

export async function updateClient(userId, clientId, data) {
    const company = pickClientCompany(data);
    const rawGst = pickClientGst(data);
    const gst = rawGst ? validateGST(rawGst) : rawGst;

    const { rows } = await pool.query(
        `UPDATE clients SET
       name = COALESCE($1, name),
       email = COALESCE($2, email),
       phone = COALESCE($3, phone),
       company_name = COALESCE($4, company_name),
       gst_number = COALESCE($5, gst_number),
       company = COALESCE($6, company),
       gst = COALESCE($7, gst),
       address = COALESCE($8, address),
       notes = COALESCE($9, notes)
     WHERE id = $10 AND user_id = $11 RETURNING *`,
        [
            data.name,
            data.email,
            data.phone,
            company,
            gst,
            company,
            gst,
            data.address,
            data.notes,
            clientId,
            userId,
        ]
    );
    if (rows.length === 0) throw new NotFoundError('Client');
    return getClient(userId, clientId);
}

export async function deleteClient(userId, clientId) {
    const { rowCount } = await pool.query('DELETE FROM clients WHERE id = $1 AND user_id = $2', [clientId, userId]);
    if (rowCount === 0) throw new NotFoundError('Client');
    return { success: true };
}

export async function autocompleteClients(userId, query) {
    const { rows } = await pool.query(
        `SELECT id, name, company_name, gst_number, company, gst, email, phone, address
     FROM clients WHERE user_id = $1 AND (
       name ILIKE $2 OR company_name ILIKE $2 OR company ILIKE $2 OR gst_number ILIKE $2 OR gst ILIKE $2
     )
     ORDER BY name LIMIT 10`,
        [userId, `%${query}%`]
    );
    return rows.map(transformClient);
}
