import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import pool from '../db/pool.js';

export async function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }
        const token = header.split(' ')[1];
        const decoded = verifyToken(token);

        const { rows } = await pool.query(
            `SELECT u.*, bp.business_name FROM users u
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       WHERE u.id = $1`,
            [decoded.userId]
        );
        if (rows.length === 0) throw new UnauthorizedError('User not found');

        req.user = rows[0];
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return next(new UnauthorizedError('Invalid or expired token'));
        }
        next(err);
    }
}

// Optional auth — sets req.user if token present, otherwise continues
export async function optionalAuth(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) return next();
        const token = header.split(' ')[1];
        const decoded = verifyToken(token);
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        if (rows.length > 0) req.user = rows[0];
        next();
    } catch {
        next();
    }
}
