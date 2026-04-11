import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/db/pool.js';
import { runMigrations } from './scripts/migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
    try {
        console.log('Running migrations...');
        await runMigrations({ closePool: false });

        console.log('Running seeds...');
        const seedSql = fs.readFileSync(path.join(__dirname, 'src/db/seed.sql'), 'utf-8');
        await pool.query(seedSql);
        console.log('Seeding completed.');

        console.log('Success!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();
