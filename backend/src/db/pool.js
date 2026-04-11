import pg from 'pg';
import config from '../config/index.js';

function parseDbUrl(url) {
    if (!url) {
        throw new Error('DATABASE_URL is required. Set it on the backend service before deploying.');
    }

    try {
        // Try standard URL parsing first
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port) || 5432,
            user: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
            database: parsed.pathname.replace('/', ''),
            ssl: { rejectUnauthorized: false },
        };
    } catch {
        // Fallback: manual parse for passwords with special chars
        // Format: postgresql://user:password@host:port/database
        const match = url.match(/^postgresql:\/\/([^:]+):(.+)@([^:]+):(\d+)\/(.+)$/);
        if (match) {
            return {
                user: match[1],
                password: match[2],
                host: match[3],
                port: parseInt(match[4]),
                database: match[5],
                ssl: { rejectUnauthorized: false },
            };
        }
        // Last resort: use as connection string
        return { connectionString: url, ssl: { rejectUnauthorized: false } };
    }
}

const poolConfig = {
    ...parseDbUrl(config.databaseUrl),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

const pool = new pg.Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
});

export default pool;
