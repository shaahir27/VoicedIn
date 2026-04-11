import pool from '../db/pool.js';
import { transformInvoice } from '../utils/transformers.js';
import { markOverdueInvoices } from '../services/invoiceService.js';

export async function getDashboard(req, res, next) {
    try {
        const userId = req.user.id;

        // Auto-mark overdue
        await markOverdueInvoices();

        // Stats
        const { rows: statsRows } = await pool.query(`
      SELECT
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COALESCE(SUM(CASE WHEN status = 'unpaid' THEN total ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0) as overdue_amount
      FROM invoices WHERE user_id = $1
    `, [userId]);

        // Total revenue from payments
        const { rows: revRows } = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) as total_revenue FROM payment_records WHERE user_id = $1',
            [userId]
        );

        const stats = {
            totalInvoices: parseInt(statsRows[0].total_invoices),
            totalRevenue: Number(revRows[0].total_revenue),
            pendingAmount: Number(statsRows[0].pending_amount),
            overdueAmount: Number(statsRows[0].overdue_amount),
            paidCount: parseInt(statsRows[0].paid_count),
            unpaidCount: parseInt(statsRows[0].unpaid_count),
            overdueCount: parseInt(statsRows[0].overdue_count),
            draftCount: parseInt(statsRows[0].draft_count),
        };

        // Recent invoices
        const { rows: recentRows } = await pool.query(
            'SELECT * FROM invoices WHERE user_id = $1 ORDER BY date DESC LIMIT 5',
            [userId]
        );

        // Alerts
        const { rows: alertRows } = await pool.query(`
      SELECT * FROM invoices WHERE user_id = $1 AND (
        status = 'overdue' OR
        (status = 'unpaid' AND due_date IS NOT NULL AND due_date <= CURRENT_DATE + INTERVAL '3 days' AND due_date >= CURRENT_DATE)
      ) ORDER BY due_date ASC
    `, [userId]);

        // Chart data — monthly revenue for last 7 months
        const { rows: chartRows } = await pool.query(`
      SELECT
        TO_CHAR(date_trunc('month', pr.date), 'Mon') as month,
        COALESCE(SUM(pr.amount), 0) as revenue
      FROM generate_series(
        date_trunc('month', NOW()) - INTERVAL '6 months',
        date_trunc('month', NOW()),
        '1 month'
      ) as m(month_start)
      LEFT JOIN payment_records pr ON date_trunc('month', pr.date) = m.month_start AND pr.user_id = $1
      GROUP BY m.month_start
      ORDER BY m.month_start ASC
    `, [userId]);

        res.json({
            success: true,
            stats,
            recentInvoices: recentRows.map(transformInvoice),
            alerts: alertRows.map(r => ({
                id: r.id,
                number: r.number,
                clientName: r.client_name,
                total: Number(r.total),
                dueDate: r.due_date?.toISOString?.()?.split('T')[0] || r.due_date,
                status: r.status,
            })),
            chartData: chartRows.map(r => ({
                month: r.month,
                revenue: Number(r.revenue),
            })),
        });
    } catch (err) { next(err); }
}
