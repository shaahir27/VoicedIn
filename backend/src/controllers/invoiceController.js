import * as invoiceService from '../services/invoiceService.js';
import { previewNextNumber } from '../services/invoiceNumberService.js';
import { generatePDF } from '../services/pdfService.js';
import { transformBusinessProfile } from '../utils/transformers.js';
import { AppError } from '../utils/errors.js';
import pool from '../db/pool.js';

export async function createInvoice(req, res, next) {
    try {
        const invoice = await invoiceService.createInvoice(req.user.id, req.body, req.isDemo);
        res.status(201).json({ success: true, invoice });
    } catch (err) { next(err); }
}

export async function updateInvoice(req, res, next) {
    try {
        const invoice = await invoiceService.updateInvoice(req.user.id, req.params.id, req.body);
        res.json({ success: true, invoice });
    } catch (err) { next(err); }
}

export async function getInvoice(req, res, next) {
    try {
        const invoice = await invoiceService.getInvoice(req.user.id, req.params.id);
        res.json({ success: true, invoice });
    } catch (err) { next(err); }
}

export async function listInvoices(req, res, next) {
    try {
        // Auto-mark overdue before listing
        await invoiceService.markOverdueInvoices();
        const result = await invoiceService.listInvoices(req.user.id, req.query);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
}

export async function deleteInvoice(req, res, next) {
    try {
        await invoiceService.deleteInvoice(req.user.id, req.params.id);
        res.json({ success: true, message: 'Invoice deleted' });
    } catch (err) { next(err); }
}

export async function updateStatus(req, res, next) {
    try {
        const invoice = await invoiceService.updateInvoiceStatus(req.user.id, req.params.id, req.body.status);
        res.json({ success: true, invoice });
    } catch (err) { next(err); }
}

export async function duplicateInvoice(req, res, next) {
    try {
        const invoice = await invoiceService.duplicateInvoice(req.user.id, req.params.id);
        res.status(201).json({ success: true, invoice });
    } catch (err) { next(err); }
}

export async function getLastForClient(req, res, next) {
    try {
        const invoice = await invoiceService.getLastInvoiceForClient(req.user.id, req.params.clientId);
        res.json({ success: true, invoice });
    } catch (err) { next(err); }
}

export async function getNextNumber(req, res, next) {
    try {
        const number = await previewNextNumber(req.user.id);
        res.json({ success: true, number });
    } catch (err) { next(err); }
}

export async function generateInvoicePDF(req, res, next) {
    try {
        const invoice = await invoiceService.getInvoice(req.user.id, req.params.id);
        const { rows } = await pool.query('SELECT * FROM business_profiles WHERE user_id = $1', [req.user.id]);
        const profile = rows.length > 0 ? transformBusinessProfile(rows[0]) : {};
        if (req.isDemo) {
            const { rows: countRows } = await pool.query('SELECT COUNT(*) as total FROM invoices WHERE user_id = $1', [req.user.id]);
            if (Number(countRows[0]?.total || 0) > 3) {
                throw new AppError('Demo is limited to 3 invoices. Upgrade to Premium for more downloads.', 403);
            }
        }

        const result = await generatePDF(invoice, profile, invoice.template, req.isDemo);

        // Update invoice pdf_url
        if (result.pdfUrl) {
            await pool.query('UPDATE invoices SET pdf_url = $1 WHERE id = $2', [result.pdfUrl, req.params.id]);
        }

        if (!result.buffer) {
            throw new AppError('PDF generation did not return a file buffer', 500);
        }

        const pdfBuffer = toBuffer(result.buffer);
        validatePdfBuffer(pdfBuffer, `Invoice ${invoice.number}`);
        const fileName = `invoice-${safeFilePart(invoice.number || req.params.id)}.pdf`;

        res.status(200);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', String(pdfBuffer.length));
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Invoice-PDF-Renderer', result.renderer || (result.fallback ? 'fallback' : 'browser'));

        console.log(`[invoice-pdf] response invoice=${invoice.number} bytes=${pdfBuffer.length} header=${pdfBuffer.subarray(0, 5).toString('ascii')} renderer=${result.renderer || (result.fallback ? 'fallback' : 'browser')}${result.fallbackReason ? ` reason=${result.fallbackReason}` : ''}`);

        return res.end(pdfBuffer);
    } catch (err) { next(err); }
}

function safeFilePart(value) {
    return String(value || Date.now()).replace(/[^a-zA-Z0-9._-]/g, '-');
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
    throw new AppError('PDF generator returned an unsupported binary type', 500);
}

function validatePdfBuffer(buffer, label) {
    if (!buffer.length) {
        throw new AppError(`${label} PDF is empty`, 500);
    }
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new AppError(`${label} PDF is invalid`, 500);
    }
}
