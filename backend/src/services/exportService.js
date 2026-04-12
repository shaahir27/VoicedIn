import pool from '../db/pool.js';
import { transformInvoice } from '../utils/transformers.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const PAGE_MARGIN = 42;

function resolveBrowserExecutablePath(puppeteer) {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const candidates = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\shaah\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Users\\shaah\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe',
    ];

    const systemPath = candidates.find(candidate => fs.existsSync(candidate));
    if (systemPath) return systemPath;

    try {
        const bundledPath = puppeteer?.executablePath?.();
        return bundledPath && fs.existsSync(bundledPath) ? bundledPath : null;
    } catch {
        return null;
    }
}

export async function exportCSV(userId, filters = {}) {
    const invoices = await getFilteredInvoices(userId, filters);

    const headers = ['Invoice Number', 'Client', 'Company', 'GST Number', 'Address', 'Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Total', 'Paid Date', 'Template', 'PDF URL'];
    const rows = invoices.map(inv => [
        inv.number,
        inv.clientName,
        inv.clientCompanyName || inv.company || '',
        inv.clientGstNumber || '',
        inv.clientAddress || '',
        inv.date,
        inv.dueDate || '',
        inv.status,
        inv.subtotal,
        inv.taxTotal,
        inv.total,
        inv.paidDate || '',
        inv.template,
        publicFileUrl(inv.pdfUrl),
    ]);

    const csv = [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(v => escapeCsv(v)).join(','))].join('\r\n');
    const csvWithBom = `\ufeff${csv}\r\n`;

    const fileName = `invoices-export-${Date.now()}.csv`;
    const exportDir = path.join(__dirname, '..', '..', config.uploadDir, 'exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const filePath = path.join(exportDir, fileName);
    fs.writeFileSync(filePath, csvWithBom, 'utf8');
    validateCsvBuffer(fs.readFileSync(filePath), headers[0]);

    logArtifact('CSV', filePath, Buffer.byteLength(csvWithBom, 'utf8'));

    return { url: `/uploads/exports/${fileName}`, fileName, filePath };
}

export async function exportExcel(userId, filters = {}) {
    const invoices = await getFilteredInvoices(userId, filters);

    const XLSX = await import('xlsx');
    const wsData = [
        ['Invoice Number', 'Client', 'Company', 'GST Number', 'Address', 'Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Total', 'Paid Date', 'PDF URL'],
        ...invoices.map(inv => [
            inv.number,
            inv.clientName,
            inv.clientCompanyName || inv.company || '',
            inv.clientGstNumber || '',
            inv.clientAddress || '',
            inv.date,
            inv.dueDate,
            inv.status,
            inv.subtotal,
            inv.taxTotal,
            inv.total,
            inv.paidDate,
            publicFileUrl(inv.pdfUrl),
        ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
        { wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 14 }, { wch: 30 },
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 48 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    const fileName = `invoices-export-${Date.now()}.xlsx`;
    const exportDir = path.join(__dirname, '..', '..', config.uploadDir, 'exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const filePath = path.join(exportDir, fileName);
    const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    fs.writeFileSync(filePath, xlsxBuffer);

    logArtifact('XLSX', filePath, xlsxBuffer.length);

    return { url: `/uploads/exports/${fileName}`, fileName, filePath };
}

export async function exportPDF(userId, filters = {}) {
    const invoices = await getFilteredInvoices(userId, filters);

    const rows = invoices.map((inv, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${inv.number}</td>
        <td>${escapeHtml(inv.clientName || '')}</td>
        <td>${escapeHtml(inv.clientCompanyName || inv.company || '')}</td>
        <td>${escapeHtml(inv.clientGstNumber || '')}</td>
        <td>${escapeHtml(inv.clientAddress || '')}</td>
        <td>${fmtDate(inv.date)}</td>
        <td>${fmtDate(inv.dueDate) || ''}</td>
        <td>${escapeHtml(inv.status || '')}</td>
        <td>${formatMoney(inv.total)}</td>
      </tr>
    `).join('');

    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #1f2937; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p.meta { margin: 0 0 18px; color: #6b7280; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 8px 6px; }
            th { background: #f8fafc; }
            .summary { display: flex; gap: 24px; margin: 16px 0 18px; font-size: 13px; }
            .summary div { padding: 10px 12px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Invoice Export</h1>
          <p class="meta">Generated on ${new Date().toLocaleString('en-IN')}</p>
          <div class="summary">
            <div><strong>Invoices</strong><br>${invoices.length}</div>
            <div><strong>Total value</strong><br>${formatMoney(totalAmount)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Invoice</th>
                <th>Client</th>
                <th>Company</th>
                <th>GST</th>
                <th>Address</th>
                <th>Date</th>
                <th>Due</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="10">No invoices found</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `;

    let pdfBuffer;
    let fallbackReason = '';
    try {
        const puppeteer = await import('puppeteer');
        const launchOptions = {
            headless: 'new',
            timeout: 60000,
            protocolTimeout: 60000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-default-browser-check',
            ],
        };
        const executablePath = resolveBrowserExecutablePath(puppeteer.default);
        if (executablePath) {
            launchOptions.executablePath = executablePath;
        }

        const browser = await puppeteer.default.launch(launchOptions);
        try {
            const page = await browser.newPage();
            await page.emulateMediaType('screen');
            await page.setContent(html, { waitUntil: 'networkidle0' });
            pdfBuffer = toBuffer(await page.pdf({
                format: 'A4',
                margin: { top: '18mm', bottom: '18mm', left: '12mm', right: '12mm' },
                printBackground: true,
            }));
        } finally {
            await browser.close().catch(() => {});
        }
    } catch (err) {
        fallbackReason = err.message;
        pdfBuffer = buildExportFallbackPdf(invoices, totalAmount);
    }

    validatePdfBuffer(pdfBuffer, 'Export PDF');

    const fileName = `invoices-export-${Date.now()}.pdf`;
    const exportDir = path.join(__dirname, '..', '..', config.uploadDir, 'exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const filePath = path.join(exportDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    validatePdfBuffer(fs.readFileSync(filePath), 'Saved export PDF');
    logArtifact('PDF', filePath, pdfBuffer.length, fallbackReason);

    return { url: `/uploads/exports/${fileName}`, fileName, filePath, fallback: Boolean(fallbackReason) };
}

async function getFilteredInvoices(userId, filters = {}) {
    let query = `
      SELECT i.*, c.company_name AS client_company_name, c.gst_number AS client_gst_number, c.address AS client_address
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.user_id = $1
    `;
    const params = [userId];
    let idx = 2;

    if (filters.dateFrom) {
        query += ` AND i.date >= $${idx++}`;
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        query += ` AND i.date <= $${idx++}`;
        params.push(filters.dateTo);
    }
    if (filters.clientId) {
        query += ` AND i.client_id = $${idx++}`;
        params.push(filters.clientId);
    }
    if (filters.status) {
        query += ` AND i.status = $${idx++}`;
        params.push(filters.status);
    }

    query += ' ORDER BY i.date DESC';
    const { rows } = await pool.query(query, params);
    return rows.map(transformInvoice);
}

function fmtDate(value) {
    if (!value) return '';
    return String(value).split('T')[0];
}

function formatMoney(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Number(amount || 0));
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeCsv(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
}

function publicFileUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;

    const baseUrl = (process.env.API_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
    return baseUrl ? `${baseUrl}${url.startsWith('/') ? url : `/${url}`}` : url;
}

function validatePdfBuffer(buffer, label) {
    const pdfBuffer = toBuffer(buffer);
    if (!pdfBuffer.length) {
        throw new Error(`${label} buffer is empty`);
    }
    const header = pdfBuffer.subarray(0, 5).toString('ascii');
    if (header !== '%PDF-') {
        throw new Error(`${label} is not a valid PDF buffer`);
    }
}

function validateCsvBuffer(buffer, firstHeader) {
    if (!buffer.length) {
        throw new Error('CSV export is empty');
    }
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    if (!text.startsWith(`"${firstHeader}"`)) {
        throw new Error('CSV export is missing headers');
    }
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
    throw new Error('Export generator returned an unsupported binary type');
}

function buildExportFallbackPdf(invoices, totalAmount) {
    const pages = [];
    let page = createPage();
    pages.push(page);

    page.cursorY = drawText(page, 'Invoice Export', PAGE_MARGIN, page.cursorY, 18, 'F2');
    page.cursorY = drawText(page, `Generated: ${new Date().toLocaleString('en-IN')}`, PAGE_MARGIN, page.cursorY, 10, 'F1');
    page.cursorY = drawText(page, `Invoices: ${invoices.length} | Total: ${formatMoneyAscii(totalAmount)}`, PAGE_MARGIN, page.cursorY, 10, 'F1');
    page.cursorY -= 10;
    page.cursorY = drawExportTableHeader(page, page.cursorY);

    invoices.forEach((inv, index) => {
        if (page.cursorY < PAGE_MARGIN + 30) {
            page = createPage();
            pages.push(page);
            page.cursorY = drawText(page, 'Invoice Export continued', PAGE_MARGIN, page.cursorY, 14, 'F2');
            page.cursorY -= 8;
            page.cursorY = drawExportTableHeader(page, page.cursorY);
        }

        drawTextAt(page, String(index + 1), PAGE_MARGIN, page.cursorY, 8, 'F1');
        drawTextAt(page, inv.number || '', PAGE_MARGIN + 25, page.cursorY, 8, 'F1');
        drawTextAt(page, truncate(inv.clientName || '', 22), PAGE_MARGIN + 115, page.cursorY, 8, 'F1');
        drawTextAt(page, fmtDate(inv.date), PAGE_MARGIN + 245, page.cursorY, 8, 'F1');
        drawTextAt(page, inv.status || '', PAGE_MARGIN + 315, page.cursorY, 8, 'F1');
        drawTextAt(page, formatMoneyAscii(inv.total), PAGE_MARGIN + 395, page.cursorY, 8, 'F1');
        drawRule(page, PAGE_MARGIN, page.cursorY - 6, A4_WIDTH - PAGE_MARGIN);
        page.cursorY -= 18;
    });

    return assemblePdf(pages);
}

function createPage() {
    return { content: [], cursorY: A4_HEIGHT - PAGE_MARGIN };
}

function drawExportTableHeader(page, y) {
    drawRule(page, PAGE_MARGIN, y + 5, A4_WIDTH - PAGE_MARGIN);
    drawTextAt(page, '#', PAGE_MARGIN, y, 9, 'F2');
    drawTextAt(page, 'Invoice', PAGE_MARGIN + 25, y, 9, 'F2');
    drawTextAt(page, 'Client', PAGE_MARGIN + 115, y, 9, 'F2');
    drawTextAt(page, 'Date', PAGE_MARGIN + 245, y, 9, 'F2');
    drawTextAt(page, 'Status', PAGE_MARGIN + 315, y, 9, 'F2');
    drawTextAt(page, 'Total', PAGE_MARGIN + 395, y, 9, 'F2');
    drawRule(page, PAGE_MARGIN, y - 7, A4_WIDTH - PAGE_MARGIN);
    return y - 22;
}

function drawText(page, text, x, y, size, font) {
    drawTextAt(page, text, x, y, size, font);
    return y - Math.max(12, size + 4);
}

function drawTextAt(page, text, x, y, size, font) {
    page.content.push(`BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`);
}

function drawRule(page, x1, y, x2) {
    page.content.push(`q 0.5 w ${x1} ${y} m ${x2} ${y} l S Q`);
}

function assemblePdf(pages) {
    const objects = [];
    const addObject = (body) => objects.push(body);

    addObject('<< /Type /Catalog /Pages 2 0 R >>');
    addObject(`<< /Type /Pages /Kids [${pages.map((_, index) => `${6 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);
    addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    pages.forEach((page, index) => {
        const content = `${page.content.join('\n')}\n`;
        addObject(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream`);
        addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5 + index * 2} 0 R >>`);
    });

    const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const objectStrings = objects.map((body, index) => `${index + 1} 0 obj\n${body}\nendobj\n`);
    let offset = Buffer.byteLength(header, 'latin1');
    const offsets = [0];
    objectStrings.forEach((objectString) => {
        offsets.push(offset);
        offset += Buffer.byteLength(objectString, 'latin1');
    });

    const xrefStart = offset;
    const xrefLines = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];
    for (let i = 1; i < offsets.length; i += 1) {
        xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
    }

    const trailer = ['trailer', `<< /Size ${objects.length + 1} /Root 1 0 R >>`, 'startxref', String(xrefStart), '%%EOF'].join('\n');
    return Buffer.from([header, ...objectStrings, `${xrefLines.join('\n')}\n`, `${trailer}\n`].join(''), 'latin1');
}

function formatMoneyAscii(amount) {
    return `Rs. ${new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Number(amount || 0))}`;
}

function truncate(value, maxLength) {
    const text = String(value || '');
    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function escapePdfText(value) {
    return String(value ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '?')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

function logArtifact(type, filePath, bytes, detail = '') {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[export:${type}] saved ${filePath} (${bytes} bytes${detail ? `, fallback: ${detail}` : ''})`);
    }
}
