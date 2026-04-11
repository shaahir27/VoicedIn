import pool from '../db/pool.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { ensurePremiumPaymentRequestSchema, transformPaymentRequest } from './subscriptionService.js';

export async function listPremiumPaymentRequests(status = 'pending') {
    await ensurePremiumPaymentRequestSchema();

    const params = [];
    let query = `
        SELECT ppr.*, u.name AS user_name, u.email AS user_email
        FROM premium_payment_requests ppr
        JOIN users u ON u.id = ppr.user_id
    `;

    if (status && status !== 'all') {
        params.push(status);
        query += ` WHERE ppr.status = $1`;
    }

    query += ' ORDER BY ppr.requested_at DESC';
    const { rows } = await pool.query(query, params);
    return rows.map(transformPaymentRequest);
}

export async function approvePremiumPaymentRequest(requestId, approvedBy = 'godmode') {
    await ensurePremiumPaymentRequestSchema();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `SELECT ppr.*, u.email AS user_email
             FROM premium_payment_requests ppr
             JOIN users u ON u.id = ppr.user_id
             WHERE ppr.id = $1
             FOR UPDATE`,
            [requestId]
        );
        if (rows.length === 0) throw new NotFoundError('Premium payment request');

        const request = rows[0];
        if (request.status === 'approved') {
            await client.query('COMMIT');
            return transformPaymentRequest(request);
        }
        if (request.status !== 'pending') {
            throw new ValidationError(`Cannot approve a ${request.status} request`);
        }

        const now = new Date();
        const renewal = new Date(now);
        renewal.setMonth(renewal.getMonth() + 1);

        const updatedSubscription = await client.query(
            `UPDATE subscriptions
             SET plan = 'premium',
                 price = $1,
                 status = 'active',
                 start_date = COALESCE(start_date, $2),
                 renewal_date = $3,
                 updated_at = NOW()
             WHERE id = (
                 SELECT id FROM subscriptions
                 WHERE user_id = $4
                 ORDER BY created_at DESC
                 LIMIT 1
             )
             RETURNING id`,
            [request.amount, now, renewal, request.user_id]
        );

        let subscriptionId = updatedSubscription.rows[0]?.id;
        if (!subscriptionId) {
            const inserted = await client.query(
                `INSERT INTO subscriptions (user_id, plan, price, status, start_date, renewal_date)
                 VALUES ($1, 'premium', $2, 'active', $3, $4)
                 RETURNING id`,
                [request.user_id, request.amount, now, renewal]
            );
            subscriptionId = inserted.rows[0].id;
        }

        await client.query(
            `UPDATE users SET subscription_status = 'active' WHERE id = $1`,
            [request.user_id]
        );

        await client.query(
            `INSERT INTO billing_payments (subscription_id, user_id, amount, date, method, status)
             VALUES ($1, $2, $3, $4, 'Static QR', 'paid')`,
            [subscriptionId, request.user_id, request.amount, now]
        );

        const { rows: approvedRows } = await client.query(
            `UPDATE premium_payment_requests
             SET status = 'approved', approved_at = $1, approved_by = $2
             WHERE id = $3
             RETURNING *`,
            [now, approvedBy, requestId]
        );

        await client.query('COMMIT');
        return transformPaymentRequest({
            ...approvedRows[0],
            user_email: request.user_email,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function rejectPremiumPaymentRequest(requestId, approvedBy = 'godmode') {
    await ensurePremiumPaymentRequestSchema();

    const { rows } = await pool.query(
        `UPDATE premium_payment_requests
         SET status = 'rejected', approved_at = NOW(), approved_by = $2
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [requestId, approvedBy]
    );
    if (rows.length === 0) throw new NotFoundError('Pending premium payment request');
    return transformPaymentRequest(rows[0]);
}
