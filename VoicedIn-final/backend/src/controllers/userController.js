import pool from '../db/pool.js';
import { transformUser } from '../utils/transformers.js';

export async function getProfile(req, res, next) {
    try {
        const { rows } = await pool.query(
            `SELECT u.*, bp.business_name FROM users u
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       WHERE u.id = $1`,
            [req.user.id]
        );
        res.json({ success: true, user: transformUser(rows[0]) });
    } catch (err) { next(err); }
}

export async function updateProfile(req, res, next) {
    try {
        const { name } = req.body;
        await pool.query('UPDATE users SET name = COALESCE($1, name) WHERE id = $2', [name, req.user.id]);
        const { rows } = await pool.query(
            `SELECT u.*, bp.business_name FROM users u
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       WHERE u.id = $1`,
            [req.user.id]
        );
        res.json({ success: true, user: transformUser(rows[0]) });
    } catch (err) { next(err); }
}
