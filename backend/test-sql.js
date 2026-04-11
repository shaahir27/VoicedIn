import pool from './src/db/pool.js';
(async () => {
    try {
        await pool.query(`
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
    `, ['1234']);
        console.log("SUCCESS");
    } catch (e) {
        console.error("ERROR 1:", e.message);
    }
    process.exit(0);
})();
