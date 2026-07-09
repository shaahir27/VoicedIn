import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';
import { AppError, NotFoundError } from '../utils/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localUploadRoot = path.join(__dirname, '..', '..', config.uploadDir);

let supabaseClient = null;

function isSupabaseConfigured() {
    return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}

function getSupabaseClient() {
    if (!isSupabaseConfigured()) {
        return null;
    }
    if (!supabaseClient) {
        supabaseClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            ...(globalThis.fetch ? { global: { fetch: globalThis.fetch.bind(globalThis) } } : {}),
        });
    }
    return supabaseClient;
}

function ensureLocalDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function normalizeFileName(fileName) {
    return String(fileName || 'file')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'file';
}

function toBuffer(value) {
    if (Buffer.isBuffer(value)) {
        return value;
    }
    if (value instanceof Uint8Array || ArrayBuffer.isView(value)) {
        return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    }
    if (value instanceof ArrayBuffer) {
        return Buffer.from(value);
    }
    throw new AppError('Unsupported binary payload for storage', 500);
}

function contentTypeForExtension(fileName, fallback = 'application/octet-stream') {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.pdf') return 'application/pdf';
    if (ext === '.csv') return 'text/csv; charset=utf-8';
    if (ext === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.svg') return 'image/svg+xml';
    if (ext === '.webp') return 'image/webp';
    return fallback;
}

async function uploadToSupabase(bucket, objectPath, body, options = {}) {
    const supabase = getSupabaseClient();
    const fileBody = toBuffer(body);
    const { error } = await supabase.storage.from(bucket).upload(objectPath, fileBody, {
        upsert: options.upsert ?? true,
        contentType: options.contentType || contentTypeForExtension(objectPath),
        cacheControl: options.cacheControl || '3600',
    });
    if (error) {
        throw new AppError(`Supabase upload failed: ${error.message}`, 502);
    }
}

async function downloadFromSupabase(bucket, objectPath) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from(bucket).download(objectPath);
    if (error) {
        if (String(error.message || '').toLowerCase().includes('not found')) {
            throw new NotFoundError('Stored file');
        }
        throw new AppError(`Supabase download failed: ${error.message}`, 502);
    }
    return Buffer.from(await data.arrayBuffer());
}

function getPublicUrl(bucket, objectPath) {
    const supabase = getSupabaseClient();
    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    return data?.publicUrl || '';
}

async function ensureSupabaseBuckets() {
    const supabase = getSupabaseClient();
    if (!supabase) return { enabled: false, bucketsReady: false };

    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        throw new AppError(`Supabase storage check failed: ${error.message}`, 502);
    }

    const bucketNames = new Set((data || []).map(bucket => bucket.name));
    return {
        enabled: true,
        bucketsReady: bucketNames.has(config.supabase.publicBucket) && bucketNames.has(config.supabase.privateBucket),
        bucketNames: [...bucketNames],
    };
}

export async function uploadBusinessLogo(userId, file) {
    const safeName = normalizeFileName(file.originalname || `logo-${Date.now()}`);
    const objectPath = `users/${userId}/logos/${safeName}`;

    if (isSupabaseConfigured()) {
        await uploadToSupabase(config.supabase.publicBucket, objectPath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '86400',
            upsert: true,
        });
        return {
            storageKey: objectPath,
            url: getPublicUrl(config.supabase.publicBucket, objectPath),
        };
    }

    const logoDir = path.join(localUploadRoot, 'logos');
    ensureLocalDir(logoDir);
    const ext = path.extname(safeName) || '.png';
    const localFileName = `logo-${userId}${ext}`;
    const filePath = path.join(logoDir, localFileName);
    fs.writeFileSync(filePath, toBuffer(file.buffer));
    return {
        storageKey: null,
        url: `/uploads/logos/${localFileName}`,
    };
}

export async function resolveBusinessLogoUrl(row) {
    if (!row) return row;
    if (row.logo_storage_key && isSupabaseConfigured()) {
        return {
            ...row,
            logo_url: getPublicUrl(config.supabase.publicBucket, row.logo_storage_key),
        };
    }
    return row;
}

export async function storeInvoicePdf(userId, invoiceId, invoiceNumber, buffer) {
    const safeFileName = normalizeFileName(`invoice-${invoiceNumber || invoiceId}.pdf`);
    const objectPath = `users/${userId}/invoices/${invoiceId}/${safeFileName}`;

    if (isSupabaseConfigured()) {
        await uploadToSupabase(config.supabase.privateBucket, objectPath, buffer, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: true,
        });
        return {
            storageKey: objectPath,
            url: `/api/invoices/${invoiceId}/pdf`,
        };
    }

    const pdfDir = path.join(localUploadRoot, 'invoices');
    ensureLocalDir(pdfDir);
    const filePath = path.join(pdfDir, safeFileName);
    fs.writeFileSync(filePath, toBuffer(buffer));
    return {
        storageKey: null,
        url: `/uploads/invoices/${safeFileName}`,
        filePath,
    };
}

export async function getInvoicePdfBuffer(storageKey, fallbackUrl) {
    if (storageKey && isSupabaseConfigured()) {
        return downloadFromSupabase(config.supabase.privateBucket, storageKey);
    }

    if (!fallbackUrl?.startsWith('/uploads/')) {
        throw new NotFoundError('Invoice PDF');
    }

    const relativePath = fallbackUrl.replace(/^\/uploads\//, '');
    const filePath = path.join(localUploadRoot, relativePath);
    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Invoice PDF');
    }
    return fs.readFileSync(filePath);
}

export async function storeExportArtifact(userId, fileName, buffer) {
    const safeFileName = normalizeFileName(fileName);
    const objectPath = `users/${userId}/exports/${safeFileName}`;

    if (isSupabaseConfigured()) {
        await uploadToSupabase(config.supabase.privateBucket, objectPath, buffer, {
            contentType: contentTypeForExtension(safeFileName),
            cacheControl: '3600',
            upsert: true,
        });
        return {
            fileName: safeFileName,
            storageKey: objectPath,
            url: `/api/exports/download/${safeFileName}`,
        };
    }

    const exportDir = path.join(localUploadRoot, 'exports');
    ensureLocalDir(exportDir);
    const filePath = path.join(exportDir, safeFileName);
    fs.writeFileSync(filePath, toBuffer(buffer));
    return {
        fileName: safeFileName,
        storageKey: null,
        url: `/api/exports/download/${safeFileName}`,
        filePath,
    };
}

export async function getExportArtifactBuffer(userId, fileName) {
    const safeFileName = normalizeFileName(fileName);
    const objectPath = `users/${userId}/exports/${safeFileName}`;

    if (isSupabaseConfigured()) {
        return downloadFromSupabase(config.supabase.privateBucket, objectPath);
    }

    const filePath = path.join(localUploadRoot, 'exports', safeFileName);
    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Export file');
    }
    return fs.readFileSync(filePath);
}

export { ensureSupabaseBuckets, isSupabaseConfigured, normalizeFileName, contentTypeForExtension };
