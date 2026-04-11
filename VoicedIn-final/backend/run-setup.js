import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
    try {
        console.log('Running migrations...');
        const migrationSql = fs.readFileSync(path.join(__dirname, 'src/db/migrations/001_initial.sql'), 'utf-8');
        await pool.query(migrationSql);
        console.log('Migrations completed.');

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
