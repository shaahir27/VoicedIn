import pool from '../db/pool.js';
import config from '../config/index.js';

let premiumRequestSchemaPromise = null;

function ensurePremiumPaymentRequestSchema() {
    if (!premiumRequestSchemaPromise) {
        premiumRequestSchemaPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS premium_payment_requests (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              amount DECIMAL(8,2) NOT NULL DEFAULT 49,
              currency VARCHAR(5) DEFAULT 'INR',
              upi_id VARCHAR(255),
              status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
              note TEXT,
              requested_at TIMESTAMPTZ DEFAULT NOW(),
              approved_at TIMESTAMPTZ,
              approved_by VARCHAR(255)
            );
            CREATE INDEX IF NOT EXISTS idx_premium_payment_requests_status ON premium_payment_requests(status);
            CREATE INDEX IF NOT EXISTS idx_premium_payment_requests_user_id ON premium_payment_requests(user_id);
        `).catch(err => {
            premiumRequestSchemaPromise = null;
            throw err;
        });
    }
    return premiumRequestSchemaPromise;
}

export async function getSubscription(userId) {
    await ensurePremiumPaymentRequestSchema();
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
            payment: getStaticPaymentInstructions(),
            paymentRequest: await getLatestPaymentRequest(userId),
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
        payment: sub.status === 'active' ? null : getStaticPaymentInstructions(),
        paymentRequest: await getLatestPaymentRequest(userId),
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
    const sub = await getSubscription(userId);
    return {
        payment: sub.payment || getStaticPaymentInstructions(),
        message: 'Static QR payment instructions returned. Premium is activated after manual confirmation.',
    };
}

export async function createPaymentRequest(userId) {
    await ensurePremiumPaymentRequestSchema();

    const subscription = await getSubscription(userId);
    if (subscription.status === 'active') {
        return { request: null, message: 'This account is already Premium.' };
    }

    const existing = await getLatestPaymentRequest(userId, 'pending');
    if (existing) {
        return { request: existing, message: 'Your Premium payment request is already pending admin approval.' };
    }

    const payment = getStaticPaymentInstructions();
    const { rows } = await pool.query(
        `INSERT INTO premium_payment_requests (user_id, amount, currency, upi_id, status, note)
         VALUES ($1, $2, $3, $4, 'pending', $5)
         RETURNING *`,
        [userId, payment.amount, payment.currency, payment.upiId || null, payment.note]
    );

    const request = transformPaymentRequest(rows[0]);
    console.log(`[godmode] Premium payment approval requested: request=${request.id} user=${userId} amount=${request.amount}`);
    return { request, message: 'Payment request sent to admin for approval.' };
}

export async function handleWebhook() {
    // External payment providers were removed. Keep this no-op so old deployments do not crash.
    return { received: true, ignored: true };
}

function getStaticPaymentInstructions() {
    return {
        amount: config.premiumPayment.amount,
        currency: 'INR',
        upiId: config.premiumPayment.upiId,
        phone: config.premiumPayment.phone,
        payeeName: config.premiumPayment.payeeName,
        qrUrl: config.premiumPayment.qrUrl,
        note: config.premiumPayment.note,
    };
}

async function getLatestPaymentRequest(userId, status) {
    await ensurePremiumPaymentRequestSchema();
    const params = [userId];
    let query = `
        SELECT ppr.*, u.name AS user_name, u.email AS user_email
        FROM premium_payment_requests ppr
        JOIN users u ON u.id = ppr.user_id
        WHERE ppr.user_id = $1
    `;
    if (status) {
        params.push(status);
        query += ` AND ppr.status = $${params.length}`;
    }
    query += ' ORDER BY ppr.requested_at DESC LIMIT 1';
    const { rows } = await pool.query(query, params);
    return rows[0] ? transformPaymentRequest(rows[0]) : null;
}

export function transformPaymentRequest(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        userName: row.user_name || '',
        userEmail: row.user_email || '',
        amount: Number(row.amount || 0),
        currency: row.currency || 'INR',
        upiId: row.upi_id || '',
        status: row.status,
        note: row.note || '',
        requestedAt: row.requested_at,
        approvedAt: row.approved_at,
        approvedBy: row.approved_by || '',
    };
}

export { ensurePremiumPaymentRequestSchema, getStaticPaymentInstructions };

