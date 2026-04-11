import pool from '../db/pool.js';
import { transformBusinessProfile } from '../utils/transformers.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', config.uploadDir, 'logos'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `logo-${req.user.id}${ext}`);
    },
});

export const logoUpload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    },
}).single('logo');

export async function getBusinessProfile(req, res, next) {
    try {
        const { rows } = await pool.query('SELECT * FROM business_profiles WHERE user_id = $1', [req.user.id]);
        if (rows.length === 0) {
            return res.json({ success: true, profile: null });
        }
        res.json({ success: true, profile: transformBusinessProfile(rows[0]) });
    } catch (err) { next(err); }
}

export async function updateBusinessProfile(req, res, next) {
    try {
        const { businessName, email, phone, address, website } = req.body;
        await pool.query(
            `UPDATE business_profiles SET
         business_name = COALESCE($1, business_name),
         contact_email = COALESCE($2, contact_email),
         contact_phone = COALESCE($3, contact_phone),
         business_address = COALESCE($4, business_address),
         website = COALESCE($5, website)
       WHERE user_id = $6`,
            [businessName, email, phone, address, website, req.user.id]
        );
        const { rows } = await pool.query('SELECT * FROM business_profiles WHERE user_id = $1', [req.user.id]);
        res.json({ success: true, profile: transformBusinessProfile(rows[0]) });
    } catch (err) { next(err); }
}

export async function uploadLogo(req, res, next) {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const logoUrl = `/uploads/logos/${req.file.filename}`;
        await pool.query('UPDATE business_profiles SET logo_url = $1 WHERE user_id = $2', [logoUrl, req.user.id]);
        res.json({ success: true, logoUrl });
    } catch (err) { next(err); }
}

export async function getSettings(req, res, next) {
    try {
        const { rows } = await pool.query('SELECT * FROM business_profiles WHERE user_id = $1', [req.user.id]);
        if (rows.length === 0) return res.json({ success: true, settings: {} });
        const p = rows[0];
        res.json({
            success: true,
            settings: {
                gst: p.gst_number,
                taxRate: Number(p.tax_rate),
                panNumber: p.pan_number,
                currency: p.currency,
                invoicePrefix: p.invoice_prefix,
                defaultNotes: p.default_notes,
                defaultTerms: p.default_terms,
                defaultTemplate: p.default_template,
            },
        });
    } catch (err) { next(err); }
}

export async function updateTaxSettings(req, res, next) {
    try {
        const { gst, taxRate, panNumber } = req.body;
        await pool.query(
            `UPDATE business_profiles SET
         gst_number = COALESCE($1, gst_number),
         tax_rate = COALESCE($2, tax_rate),
         pan_number = COALESCE($3, pan_number)
       WHERE user_id = $4`,
            [gst, taxRate, panNumber, req.user.id]
        );
        res.json({ success: true, message: 'Tax settings updated' });
    } catch (err) { next(err); }
}

export async function updateInvoiceSettings(req, res, next) {
    try {
        const { currency, invoicePrefix, defaultNotes, defaultTerms, defaultTemplate } = req.body;
        await pool.query(
            `UPDATE business_profiles SET
         currency = COALESCE($1, currency),
         invoice_prefix = COALESCE($2, invoice_prefix),
         default_notes = COALESCE($3, default_notes),
         default_terms = COALESCE($4, default_terms),
         default_template = COALESCE($5, default_template)
       WHERE user_id = $6`,
            [currency, invoicePrefix, defaultNotes, defaultTerms, defaultTemplate, req.user.id]
        );
        res.json({ success: true, message: 'Invoice settings updated' });
    } catch (err) { next(err); }
}
