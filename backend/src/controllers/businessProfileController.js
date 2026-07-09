import pool from '../db/pool.js';
import { transformBusinessProfile } from '../utils/transformers.js';
import multer from 'multer';
import { uploadBusinessLogo, resolveBusinessLogoUrl } from '../services/storageService.js';

export const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
        const dotIndex = file.originalname.lastIndexOf('.');
        const ext = dotIndex >= 0 ? file.originalname.slice(dotIndex).toLowerCase() : '';
        cb(null, allowed.includes(ext));
    },
}).single('logo');

export async function getBusinessProfile(req, res, next) {
    try {
        const { rows } = await pool.query('SELECT * FROM business_profiles WHERE user_id = $1', [req.user.id]);
        if (rows.length === 0) {
            return res.json({ success: true, profile: null });
        }
        const profileRow = await resolveBusinessLogoUrl(rows[0]);
        res.json({ success: true, profile: transformBusinessProfile(profileRow) });
    } catch (err) { next(err); }
}

export async function updateBusinessProfile(req, res, next) {
    try {
        const {
            businessName,
            email,
            phone,
            address,
            website,
            bankAccountName,
            bankName,
            bankAccountNumber,
            bankIfsc,
            bankUpi,
            includeBankDetails,
        } = req.body;
        await pool.query(
            `INSERT INTO business_profiles (
         user_id, business_name, contact_email, contact_phone, business_address, website,
         bank_account_name, bank_name, bank_account_number, bank_ifsc, bank_upi, include_bank_details
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, false))
       ON CONFLICT (user_id) DO UPDATE SET
         business_name = COALESCE($2, business_profiles.business_name),
         contact_email = COALESCE($3, business_profiles.contact_email),
         contact_phone = COALESCE($4, business_profiles.contact_phone),
         business_address = COALESCE($5, business_profiles.business_address),
         website = COALESCE($6, business_profiles.website),
         bank_account_name = COALESCE($7, business_profiles.bank_account_name),
         bank_name = COALESCE($8, business_profiles.bank_name),
         bank_account_number = COALESCE($9, business_profiles.bank_account_number),
         bank_ifsc = COALESCE($10, business_profiles.bank_ifsc),
         bank_upi = COALESCE($11, business_profiles.bank_upi),
             include_bank_details = COALESCE($12, business_profiles.include_bank_details)`,
            [req.user.id, businessName, email, phone, address, website, bankAccountName, bankName, bankAccountNumber, bankIfsc, bankUpi, includeBankDetails]
        );
        const { rows } = await pool.query('SELECT * FROM business_profiles WHERE user_id = $1', [req.user.id]);
        const profileRow = await resolveBusinessLogoUrl(rows[0]);
        res.json({ success: true, profile: transformBusinessProfile(profileRow) });
    } catch (err) { next(err); }
}

export async function uploadLogo(req, res, next) {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const stored = await uploadBusinessLogo(req.user.id, req.file);
        const { rows } = await pool.query(
            `INSERT INTO business_profiles (user_id, logo_url, logo_storage_key)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET logo_url = EXCLUDED.logo_url
               , logo_storage_key = EXCLUDED.logo_storage_key
             RETURNING *`,
            [req.user.id, stored.url, stored.storageKey]
        );
        const profileRow = await resolveBusinessLogoUrl(rows[0]);
        res.json({ success: true, logoUrl: profileRow.logo_url, profile: transformBusinessProfile(profileRow) });
    } catch (err) { next(err); }
}

export async function getSettings(req, res, next) {
    try {
        const { rows } = await pool.query('SELECT * FROM business_profiles WHERE user_id = $1', [req.user.id]);
        if (rows.length === 0) return res.json({ success: true, settings: {} });
        const p = await resolveBusinessLogoUrl(rows[0]);
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
                bankAccountName: p.bank_account_name || '',
                bankName: p.bank_name || '',
                bankAccountNumber: p.bank_account_number || '',
                bankIfsc: p.bank_ifsc || '',
                bankUpi: p.bank_upi || '',
                includeBankDetails: Boolean(p.include_bank_details),
                logoUrl: p.logo_url || null,
            },
        });
    } catch (err) { next(err); }
}

export async function updateTaxSettings(req, res, next) {
    try {
        const { gst, taxRate, panNumber } = req.body;
        await pool.query(
            `INSERT INTO business_profiles (user_id, gst_number, tax_rate, pan_number)
       VALUES ($1, $2, COALESCE($3, 18), $4)
       ON CONFLICT (user_id) DO UPDATE SET
         gst_number = COALESCE($2, business_profiles.gst_number),
         tax_rate = COALESCE($3, business_profiles.tax_rate),
         pan_number = COALESCE($4, business_profiles.pan_number)`,
            [req.user.id, gst, taxRate, panNumber]
        );
        res.json({ success: true, message: 'Tax settings updated' });
    } catch (err) { next(err); }
}

export async function updateInvoiceSettings(req, res, next) {
    try {
        const { currency, invoicePrefix, defaultNotes, defaultTerms, defaultTemplate } = req.body;
        await pool.query(
            `INSERT INTO business_profiles (user_id, currency, invoice_prefix, default_notes, default_terms, default_template)
       VALUES ($1, COALESCE($2, 'INR'), COALESCE($3, 'INV'), COALESCE($4, ''), COALESCE($5, ''), COALESCE($6, 'modern'))
       ON CONFLICT (user_id) DO UPDATE SET
         currency = COALESCE($2, business_profiles.currency),
         invoice_prefix = COALESCE($3, business_profiles.invoice_prefix),
         default_notes = COALESCE($4, business_profiles.default_notes),
         default_terms = COALESCE($5, business_profiles.default_terms),
         default_template = COALESCE($6, business_profiles.default_template)`,
            [req.user.id, currency, invoicePrefix, defaultNotes, defaultTerms, defaultTemplate]
        );
        res.json({ success: true, message: 'Invoice settings updated' });
    } catch (err) { next(err); }
}
