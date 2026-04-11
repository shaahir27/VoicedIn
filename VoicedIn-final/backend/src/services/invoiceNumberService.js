import pool from '../db/pool.js';

export async function getNextNumber(userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get user's prefix and current sequence
        const { rows: profileRows } = await client.query(
            `SELECT bp.invoice_prefix FROM business_profiles bp WHERE bp.user_id = $1`,
            [userId]
        );
        const prefix = profileRows[0]?.invoice_prefix || 'INV';

        // Increment and get sequence
        const { rows: seqRows } = await client.query(
            `INSERT INTO invoice_sequences (user_id, current_seq)
       VALUES ($1, 1)
       ON CONFLICT (user_id) DO UPDATE SET current_seq = invoice_sequences.current_seq + 1
       RETURNING current_seq`,
            [userId]
        );

        await client.query('COMMIT');

        const seq = seqRows[0].current_seq;
        const now = new Date();
        const yy = now.getFullYear().toString().slice(-2);
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const num = seq.toString().padStart(4, '0');

        return `${prefix}-${yy}${mm}-${num}`;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function previewNextNumber(userId) {
    const { rows: profileRows } = await pool.query(
        `SELECT bp.invoice_prefix FROM business_profiles bp WHERE bp.user_id = $1`,
        [userId]
    );
    const prefix = profileRows[0]?.invoice_prefix || 'INV';

    const { rows: seqRows } = await pool.query(
        'SELECT current_seq FROM invoice_sequences WHERE user_id = $1',
        [userId]
    );
    const nextSeq = (seqRows[0]?.current_seq || 0) + 1;

    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const num = nextSeq.toString().padStart(4, '0');

    return `${prefix}-${yy}${mm}-${num}`;
}
