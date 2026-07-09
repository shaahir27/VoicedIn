import pool from '../db/pool.js';

export async function logAuditEvent(eventType, {
    actorUserId = null,
    targetUserId = null,
    requestId = null,
    metadata = {},
} = {}) {
    try {
        await pool.query(
            `INSERT INTO audit_log_events (event_type, actor_user_id, target_user_id, request_id, metadata)
             VALUES ($1, $2, $3, $4, $5::jsonb)`,
            [eventType, actorUserId, targetUserId, requestId, JSON.stringify(metadata || {})]
        );
    } catch (err) {
        // Audit failures should not break primary user flows, but they should still be visible.
        console.error(`[audit] failed to persist ${eventType}:`, err.message);
    }
}
