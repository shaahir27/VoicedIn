import pool from '../db/pool.js';

export async function getSubscription(userId) {
    const { rows } = await pool.query(
        `SELECT s.*, u.demo_used, u.demo_started_at, u.demo_completed_at
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC LIMIT 1`,
        [userId]
    );

    if (rows.length === 0) {
        return {
            plan: 'demo',
            status: 'demo',
            demoUsed: false,
            renewalDate: null,
            upgradeRequired: true,
        };
    }

    const sub = rows[0];
    return {
        id: sub.id,
        plan: sub.plan,
        price: Number(sub.price),
        status: sub.status,
        demoUsed: sub.demo_used,
        startDate: sub.start_date,
        renewalDate: sub.renewal_date,
        expiryDate: sub.expiry_date,
        upgradeRequired: sub.status !== 'active',
    };
}

export async function getBillingHistory(userId) {
    const { rows } = await pool.query(
        `SELECT * FROM billing_payments WHERE user_id = $1 ORDER BY date DESC`,
        [userId]
    );
    return rows.map(r => ({
        date: r.date?.toISOString?.()?.split('T')[0] || r.date,
        amount: `₹${Number(r.amount)}`,
        status: r.status,
        method: r.method,
    }));
}

export async function createCheckout(userId) {
    // Dodo Payments integration placeholder
    // In production, you would create a checkout session with Dodo Payments API
    return {
        checkoutUrl: `https://checkout.dodopayments.com/session/${Date.now()}`,
        message: 'Redirect user to checkout URL',
    };
}

export async function handleWebhook(payload, signature) {
    // Verify webhook signature from Dodo
    // Process subscription events: payment_success, payment_failed, subscription_cancelled, etc.

    const event = payload.event || payload.type;

    if (event === 'payment.success' || event === 'subscription.active') {
        const userId = payload.metadata?.userId;
        if (userId) {
            await activateSubscription(userId, payload);
        }
    }

    if (event === 'payment.failed') {
        const userId = payload.metadata?.userId;
        if (userId) {
            await pool.query(
                `UPDATE subscriptions SET status = 'payment_failed', failure_reason = $1 WHERE user_id = $2`,
                [payload.error?.message || 'Payment failed', userId]
            );
            await pool.query(`UPDATE users SET subscription_status = 'premium_expired' WHERE id = $1`, [userId]);
        }
    }

    if (event === 'subscription.cancelled') {
        const userId = payload.metadata?.userId;
        if (userId) {
            await pool.query(`UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1`, [userId]);
            await pool.query(`UPDATE users SET subscription_status = 'cancelled' WHERE id = $1`, [userId]);
        }
    }

    return { received: true };
}

async function activateSubscription(userId, payload) {
    const now = new Date();
    const renewal = new Date(now);
    renewal.setMonth(renewal.getMonth() + 1);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE subscriptions SET
        plan = 'premium', price = 99, status = 'active',
        start_date = $1, renewal_date = $2,
        provider_customer_id = $3, provider_subscription_id = $4, provider_payment_id = $5
       WHERE user_id = $6`,
            [now, renewal, payload.customer_id, payload.subscription_id, payload.payment_id, userId]
        );

        await client.query(
            `UPDATE users SET subscription_status = 'active' WHERE id = $1`,
            [userId]
        );

        // Record billing payment
        await client.query(
            `INSERT INTO billing_payments (user_id, amount, date, method, status) VALUES ($1, 99, $2, 'Online', 'paid')`,
            [userId, now]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
