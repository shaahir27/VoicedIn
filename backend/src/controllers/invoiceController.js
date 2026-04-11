import * as invoiceService from '../services/invoiceService.js';
import { previewNextNumber } from '../services/invoiceNumberService.js';
import { generatePDF } from '../services/pdfService.js';
import { transformBusinessProfile } from '../utils/transformers.js';
import pool from '../db/pool.js';
import path from 'path';
import fs from 'fs';

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

        const result = await generatePDF(invoice, profile, invoice.template, req.isDemo);

        // Update invoice pdf_url
        if (result.pdfUrl) {
            await pool.query('UPDATE invoices SET pdf_url = $1 WHERE id = $2', [result.pdfUrl, req.params.id]);
        }

        if (result.buffer) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.number}.pdf"`);
            return res.send(result.buffer);
        }

        res.json({ success: true, pdfUrl: result.pdfUrl });
    } catch (err) { next(err); }
}
