import app from './app.js';
import config from './config/index.js';
import pool from './db/pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure upload directories exist
const uploadDirs = [
    path.join(__dirname, '..', config.uploadDir),
    path.join(__dirname, '..', config.uploadDir, 'logos'),
    path.join(__dirname, '..', config.uploadDir, 'invoices'),
    path.join(__dirname, '..', config.uploadDir, 'exports'),
];
for (const dir of uploadDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Verify database connection
async function start() {
    try {
        const client = await pool.connect();
        console.log('✓ Database connected');
        client.release();
    } catch (err) {
        console.error('✗ Database connection failed:', err.message);
        console.log('  Make sure PostgreSQL is running and DATABASE_URL is correct in .env');
        if (config.nodeEnv === 'production') {
            process.exit(1);
        }
        console.log('  Server will start but database queries will fail.');
    }

    app.listen(config.port, () => {
        console.log(`\n🚀 VoicedIn API running at http://localhost:${config.port}`);
        console.log(`   Environment: ${config.nodeEnv}`);
        console.log(`   Frontend URLs: ${config.frontendUrls.join(', ')}\n`);
    });
}

start();
