import pool from '../db/pool.js';
import { transformInvoice } from '../utils/transformers.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import config from '../config/index.js';
import { generatePDF } from './pdfService.js';
import { transformBusinessProfile } from '../utils/transformers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function exportCSV(userId, filters = {}) {
    const invoices = await getFilteredInvoices(userId, filters);

    const headers = ['Invoice Number', 'Client', 'Company', 'Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Total', 'Paid Date', 'Template'];
    const rows = invoices.map(inv => [
        inv.number, inv.clientName, inv.company, inv.date, inv.dueDate || '', inv.status,
        inv.subtotal, inv.taxTotal, inv.total, inv.paidDate || '', inv.template,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

    const fileName = `invoices-export-${Date.now()}.csv`;
    const exportDir = path.join(__dirname, '..', '..', config.uploadDir, 'exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const filePath = path.join(exportDir, fileName);
    fs.writeFileSync(filePath, csv);

    return { url: `/uploads/exports/${fileName}`, fileName, filePath };
}

export async function exportExcel(userId, filters = {}) {
    const invoices = await getFilteredInvoices(userId, filters);

    const XLSX = await import('xlsx');
    const wsData = [
        ['Invoice Number', 'Client', 'Company', 'Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Total', 'Paid Date'],
        ...invoices.map(inv => [
            inv.number, inv.clientName, inv.company, inv.date, inv.dueDate, inv.status,
            inv.subtotal, inv.taxTotal, inv.total, inv.paidDate,
        ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
        { wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    const fileName = `invoices-export-${Date.now()}.xlsx`;
    const exportDir = path.join(__dirname, '..', '..', config.uploadDir, 'exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const filePath = path.join(exportDir, fileName);
    XLSX.writeFile(wb, filePath);

    return { url: `/uploads/exports/${fileName}`, fileName, filePath };
}

export async function exportPDF(userId, filters = {}) {
    const invoices = await getFilteredInvoices(userId, filters);

    // Get business profile for templates
    const { rows } = await pool.query('SELECT * FROM business_profiles WHERE user_id = $1', [userId]);
    const profile = rows.length > 0 ? transformBusinessProfile(rows[0]) : {};

    const fileName = `invoices-pdf-export-${Date.now()}.zip`;
    const exportDir = path.join(__dirname, '..', '..', config.uploadDir, 'exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const filePath = path.join(exportDir, fileName);
    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        output.on('close', () => resolve({ url: `/uploads/exports/${fileName}`, fileName, filePath }));
        archive.on('warning', err => { if (err.code !== 'ENOENT') reject(err); });
        archive.on('error', reject);

        archive.pipe(output);

        // Generate PDFs in series to avoid puppeteer memory spikes
        async function processPdfs() {
            for (const inv of invoices) {
                const { pdfPath } = await generatePDF(inv, profile, inv.template);
                if (pdfPath && fs.existsSync(pdfPath)) {
                    archive.file(pdfPath, { name: `invoice-${inv.number}.pdf` });
                }
            }
        }

        processPdfs().then(() => archive.finalize()).catch(reject);
    });
}

async function getFilteredInvoices(userId, filters = {}) {
    let query = 'SELECT * FROM invoices WHERE user_id = $1';
    const params = [userId];
    let idx = 2;

    if (filters.dateFrom) {
        query += ` AND date >= $${idx++}`;
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        query += ` AND date <= $${idx++}`;
        params.push(filters.dateTo);
    }
    if (filters.clientId) {
        query += ` AND client_id = $${idx++}`;
        params.push(filters.clientId);
    }
    if (filters.status) {
        query += ` AND status = $${idx++}`;
        params.push(filters.status);
    }

    query += ' ORDER BY date DESC';
    const { rows } = await pool.query(query, params);
    return rows.map(transformInvoice);
}
