import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import pool from '../db/pool.js';
import config from '../config/index.js';
import { generateToken } from '../utils/jwt.js';
import { AppError, UnauthorizedError, ValidationError } from '../utils/errors.js';
import { validateEmail, validateRequired } from '../utils/validators.js';
import { transformUser } from '../utils/transformers.js';
import crypto from 'crypto';

const googleClient = new OAuth2Client(config.google.clientId);

export async function signup({ name, email, password }) {
    validateRequired(['name', 'email', 'password'], { name, email, password });
    email = validateEmail(email);
    if (password.length < 6) throw new ValidationError('Password must be at least 6 characters');

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) throw new AppError('An account with this email already exists', 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `INSERT INTO users (name, email, password_hash, auth_provider, subscription_status)
       VALUES ($1, $2, $3, 'email', 'demo') RETURNING *`,
            [name, email, passwordHash]
        );
        const user = rows[0];

        // Create business profile
        await client.query(
            `INSERT INTO business_profiles (user_id, business_name, contact_email)
       VALUES ($1, $2, $3)`,
            [user.id, name, email]
        );

        // Create demo subscription
        await client.query(
            `INSERT INTO subscriptions (user_id, plan, price, status) VALUES ($1, 'demo', 0, 'demo')`,
            [user.id]
        );

        // Create invoice sequence
        await client.query(
            `INSERT INTO invoice_sequences (user_id, current_seq) VALUES ($1, 0)`,
            [user.id]
        );

        await client.query('COMMIT');

        const token = generateToken({ userId: user.id, email: user.email });
        return { user: transformUser({ ...user, business_name: name }), token };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function login({ email, password }) {
    validateRequired(['email', 'password'], { email, password });
    email = validateEmail(email);

    const { rows } = await pool.query(
        `SELECT u.*, bp.business_name FROM users u
     LEFT JOIN business_profiles bp ON bp.user_id = u.id
     WHERE u.email = $1`,
        [email]
    );
    if (rows.length === 0) throw new UnauthorizedError('Invalid email or password');

    const user = rows[0];
    if (!user.password_hash) throw new UnauthorizedError('This account uses Google login. Please sign in with Google.');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid email or password');

    const token = generateToken({ userId: user.id, email: user.email });
    return { user: transformUser(user), token };
}

export async function googleAuth({ idToken }) {
    if (!idToken) throw new ValidationError('Google ID token is required');

    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: config.google.clientId,
        });
        payload = ticket.getPayload();
    } catch {
        throw new UnauthorizedError('Invalid Google token');
    }

    const { email, name, picture, sub: googleId } = payload;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if user exists
        let { rows } = await client.query(
            `SELECT u.*, bp.business_name FROM users u
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       WHERE u.email = $1`,
            [email]
        );

        let user;
        if (rows.length > 0) {
            user = rows[0];
            // Update auth provider if was email
            if (user.auth_provider === 'email') {
                await client.query(
                    `UPDATE users SET auth_provider = 'google', avatar_url = COALESCE(avatar_url, $1) WHERE id = $2`,
                    [picture, user.id]
                );
            }
        } else {
            // Create new user
            const { rows: newRows } = await client.query(
                `INSERT INTO users (name, email, auth_provider, avatar_url, subscription_status)
         VALUES ($1, $2, 'google', $3, 'demo') RETURNING *`,
                [name, email, picture]
            );
            user = newRows[0];

            await client.query(
                `INSERT INTO business_profiles (user_id, business_name, contact_email) VALUES ($1, $2, $3)`,
                [user.id, name, email]
            );
            await client.query(
                `INSERT INTO subscriptions (user_id, plan, price, status) VALUES ($1, 'demo', 0, 'demo')`,
                [user.id]
            );
            await client.query(
                `INSERT INTO invoice_sequences (user_id, current_seq) VALUES ($1, 0)`,
                [user.id]
            );
            user.business_name = name;
        }

        await client.query('COMMIT');

        const token = generateToken({ userId: user.id, email: user.email });
        return { user: transformUser(user), token };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function forgotPassword({ email }) {
    validateRequired(['email'], { email });
    email = validateEmail(email);

    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1 AND auth_provider = $2', [email, 'email']);
    // Always return success to prevent email enumeration
    if (rows.length === 0) return { message: 'If an account exists with this email, a reset link has been sent.' };

    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
        `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [rows[0].id, token, expiresAt]
    );

    // In production, send email with reset link: ${config.frontendUrl}/reset-password?token=${token}
    console.log(`Password reset token for ${email}: ${token}`);

    return { message: 'If an account exists with this email, a reset link has been sent.', token };
}

export async function resetPassword({ token, newPassword }) {
    validateRequired(['token', 'newPassword'], { token, newPassword });
    if (newPassword.length < 6) throw new ValidationError('Password must be at least 6 characters');

    const { rows } = await pool.query(
        `SELECT * FROM password_resets WHERE token = $1 AND used = false AND expires_at > NOW()`,
        [token]
    );
    if (rows.length === 0) throw new AppError('Invalid or expired reset token', 400);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, rows[0].user_id]);
    await pool.query('UPDATE password_resets SET used = true WHERE id = $1', [rows[0].id]);

    return { message: 'Password reset successfully. You can now log in.' };
}
