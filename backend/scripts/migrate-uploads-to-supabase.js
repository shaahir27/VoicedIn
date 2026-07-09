import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pool from '../src/db/pool.js';
import config from '../src/config/index.js';
import { contentTypeForExtension, normalizeFileName } from '../src/services/storageService.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const uploadRoot = path.resolve(backendRoot, config.uploadDir);
const dryRun = !process.argv.includes('--apply');

function requireStorageConfig() {
    const missing = [];
    if (!config.supabase.url) missing.push('SUPABASE_URL');
    if (!config.supabase.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!config.supabase.publicBucket) missing.push('SUPABASE_STORAGE_PUBLIC_BUCKET');
    if (!config.supabase.privateBucket) missing.push('SUPABASE_STORAGE_PRIVATE_BUCKET');

    if (missing.length) {
        throw new Error(`Missing required Supabase config: ${missing.join(', ')}`);
    }
}

function createSupabaseClient() {
    requireStorageConfig();
    return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

async function fileExists(filePath) {
    try {
        const stat = await fs.stat(filePath);
        return stat.isFile();
    } catch {
        return false;
    }
}

async function uploadObject(supabase, bucket, objectPath, filePath) {
    const buffer = await fs.readFile(filePath);
    if (dryRun) {
        return { bytes: buffer.length, skipped: true };
    }

    const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
        upsert: true,
        contentType: contentTypeForExtension(objectPath),
        cacheControl: '3600',
    });

    if (error) {
        throw new Error(`Upload failed for ${bucket}/${objectPath}: ${error.message}`);
    }

    return { bytes: buffer.length, skipped: false };
}

function uploadsRelativePath(url) {
    if (!url?.startsWith('/uploads/')) return null;
    return url.replace(/^\/uploads\//, '').replace(/\//g, path.sep);
}

async function migrateInvoicePdfs(supabase) {
    const { rows } = await pool.query(
        `SELECT id, user_id, number, pdf_url, pdf_storage_key
         FROM invoices
         WHERE pdf_url LIKE '/uploads/invoices/%'
         ORDER BY created_at ASC, id ASC`
    );

    let migrated = 0;
    let missing = 0;
    let skipped = 0;

    for (const invoice of rows) {
        if (invoice.pdf_storage_key) {
            skipped += 1;
            continue;
        }

        const relativePath = uploadsRelativePath(invoice.pdf_url);
        const filePath = relativePath ? path.join(uploadRoot, relativePath) : null;
        if (!filePath || !(await fileExists(filePath))) {
            missing += 1;
            console.warn(`[missing] invoice=${invoice.id} file=${filePath || invoice.pdf_url}`);
            continue;
        }

        const safeFileName = normalizeFileName(`invoice-${invoice.number || invoice.id}.pdf`);
        const objectPath = `users/${invoice.user_id}/invoices/${invoice.id}/${safeFileName}`;
        const result = await uploadObject(supabase, config.supabase.privateBucket, objectPath, filePath);

        if (!dryRun) {
            await pool.query(
                `UPDATE invoices
                 SET pdf_url = $1, pdf_storage_key = $2
                 WHERE id = $3 AND user_id = $4`,
                [`/api/invoices/${invoice.id}/pdf`, objectPath, invoice.id, invoice.user_id]
            );
        }

        migrated += 1;
        console.log(`[${dryRun ? 'dry-run' : 'uploaded'}] invoice=${invoice.number || invoice.id} bytes=${result.bytes} -> ${config.supabase.privateBucket}/${objectPath}`);
    }

    return { scanned: rows.length, migrated, missing, skipped };
}

async function migrateBusinessLogos(supabase) {
    const { rows } = await pool.query(
        `SELECT user_id, logo_url, logo_storage_key
         FROM business_profiles
         WHERE logo_url LIKE '/uploads/logos/%'
         ORDER BY user_id ASC`
    );

    let migrated = 0;
    let missing = 0;
    let skipped = 0;

    for (const profile of rows) {
        if (profile.logo_storage_key) {
            skipped += 1;
            continue;
        }

        const relativePath = uploadsRelativePath(profile.logo_url);
        const filePath = relativePath ? path.join(uploadRoot, relativePath) : null;
        if (!filePath || !(await fileExists(filePath))) {
            missing += 1;
            console.warn(`[missing] logo user=${profile.user_id} file=${filePath || profile.logo_url}`);
            continue;
        }

        const safeFileName = normalizeFileName(path.basename(filePath));
        const objectPath = `users/${profile.user_id}/logos/${safeFileName}`;
        const result = await uploadObject(supabase, config.supabase.publicBucket, objectPath, filePath);
        const { data } = supabase.storage.from(config.supabase.publicBucket).getPublicUrl(objectPath);

        if (!dryRun) {
            await pool.query(
                `UPDATE business_profiles
                 SET logo_url = $1, logo_storage_key = $2
                 WHERE user_id = $3`,
                [data?.publicUrl || profile.logo_url, objectPath, profile.user_id]
            );
        }

        migrated += 1;
        console.log(`[${dryRun ? 'dry-run' : 'uploaded'}] logo user=${profile.user_id} bytes=${result.bytes} -> ${config.supabase.publicBucket}/${objectPath}`);
    }

    return { scanned: rows.length, migrated, missing, skipped };
}

async function main() {
    const supabase = createSupabaseClient();
    const mode = dryRun ? 'DRY RUN' : 'APPLY';

    console.log(`Migrating local uploads to Supabase Storage (${mode})`);
    console.log(`Upload root: ${uploadRoot}`);
    console.log(`Public bucket: ${config.supabase.publicBucket}`);
    console.log(`Private bucket: ${config.supabase.privateBucket}`);

    const invoiceSummary = await migrateInvoicePdfs(supabase);
    const logoSummary = await migrateBusinessLogos(supabase);

    console.log('Summary');
    console.log({ invoices: invoiceSummary, logos: logoSummary });

    if (dryRun) {
        console.log('No files or database rows were changed. Re-run with --apply to copy files and update storage keys.');
    }
}

main()
    .catch((err) => {
        console.error(err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end().catch(() => {});
    });
