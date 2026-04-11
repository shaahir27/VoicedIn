import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'src', 'db', 'migrations');

async function ensureMigrationsTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
}

async function hasExistingInitialSchema(client) {
    const { rows } = await client.query("SELECT to_regclass('public.users') AS users_table");
    return Boolean(rows[0]?.users_table);
}

export async function runMigrations({ closePool = true } = {}) {
    const client = await pool.connect();

    try {
        await ensureMigrationsTable(client);

        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const applied = await client.query(
                'SELECT 1 FROM schema_migrations WHERE filename = $1',
                [file]
            );

            if (applied.rowCount > 0) {
                console.log(`Skipping ${file}`);
                continue;
            }

            if (file === '001_initial.sql' && await hasExistingInitialSchema(client)) {
                console.log('Baselining existing schema as 001_initial.sql');
                await client.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1)',
                    [file]
                );
                continue;
            }

            console.log(`Applying ${file}`);
            await client.query('BEGIN');
            try {
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
                await client.query(sql);
                await client.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1)',
                    [file]
                );
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }

        console.log('Migrations completed.');
    } finally {
        client.release();
        if (closePool) await pool.end();
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runMigrations().catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}
