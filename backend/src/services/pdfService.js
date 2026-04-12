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

    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

    const candidates = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ];

    const systemPath = candidates.find(candidate => candidate && fs.existsSync(candidate));
    if (systemPath) return systemPath;

    try {
        const bundledPath = puppeteer?.executablePath?.();
        return bundledPath && fs.existsSync(bundledPath) ? bundledPath : null;
    } catch {
        return null;
    }
}

export async function generatePDF(invoiceData, businessProfile, templateId = 'modern', isDemo = false) {
    const resolvedProfile = {
        ...businessProfile,
        includeBankDetails: invoiceData.includeBankDetails ?? businessProfile?.includeBankDetails,
    };

    let html = buildInvoiceHtml(invoiceData, resolvedProfile, templateId);

    if (isDemo) {
        html = html.replace('</body>', `
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:100px;color:rgba(200,0,0,0.1);font-weight:bold;z-index:9999;pointer-events:none;">
        DEMO - NOT VALID
      </div>
    </body>`);
    }

    const fileName = `invoice-${safeFilePart(invoiceData.number || Date.now())}.pdf`;
    const pdfDir = path.join(__dirname, '..', '..', config.uploadDir, 'invoices');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const pdfPath = path.join(pdfDir, fileName);

    try {
        const pdfBuffer = await generateBrowserPdf(html);
        validatePdfBuffer(pdfBuffer, 'Invoice PDF');
        fs.writeFileSync(pdfPath, pdfBuffer);
        verifySavedPdf(pdfPath, 'Invoice PDF');

        console.log(`[invoice-pdf] saved ${pdfPath} (${pdfBuffer.length} bytes, browser)`);

        return {
            pdfUrl: `/uploads/invoices/${fileName}`,
            pdfPath,
            buffer: pdfBuffer,
            renderer: 'browser',
        };
    } catch (browserErr) {
        const pdfBuffer = buildFallbackPdf(invoiceData, resolvedProfile, isDemo);
        validatePdfBuffer(pdfBuffer, 'Invoice PDF fallback');
        fs.writeFileSync(pdfPath, pdfBuffer);
        verifySavedPdf(pdfPath, 'Invoice PDF fallback');

        console.warn(`[invoice-pdf] browser renderer failed; saved fallback ${pdfPath} (${pdfBuffer.length} bytes): ${browserErr.message}`);

        return {
            pdfUrl: `/uploads/invoices/${fileName}`,
            pdfPath,
            buffer: pdfBuffer,
            renderer: 'fallback',
            fallback: true,
            fallbackReason: browserErr.message,
        };
    }
}

async function generateBrowserPdf(html) {
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
        const pdfBytes = await page.pdf({
            format: 'A4',
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
            printBackground: true,
        });
        return toBuffer(pdfBytes);
    } finally {
        await browser.close().catch(() => { });
    }
}

function buildInvoiceHtml(invoiceData, businessProfile = {}, templateId = 'modern') {
    const theme = getTemplateTheme(templateId);
    const businessName = businessProfile.businessName || businessProfile.name || 'VoicedIn';
    const clientCompany = invoiceData.clientCompanyName || invoiceData.company || invoiceData.clientDetails?.companyName || '';
    const clientGst = invoiceData.clientGstNumber || invoiceData.clientDetails?.gstNumber || '';
    const clientAddress = invoiceData.clientAddress || invoiceData.clientDetails?.address || '';
    const terms = invoiceData.terms || businessProfile.defaultTerms || '';
    const notes = invoiceData.notes || '';
    const hasSidebarContent = Boolean(notes || terms);
    const businessContact = [businessProfile.email, businessProfile.phone].filter(Boolean).join(' | ');
    const businessTax = [businessProfile.gst ? `GST: ${businessProfile.gst}` : '', businessProfile.panNumber ? `PAN: ${businessProfile.panNumber}` : ''].filter(Boolean).join(' | ');
    const bankRows = buildBankDetailsRows(businessProfile);
    const itemRows = (invoiceData.items || []).map((item, i) => {
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const tax = Number(item.tax || 0);
        const amount = qty * rate * (1 + tax / 100);
        return `
          <tr>
            <td>${i + 1}</td>
            <td class="description">${escapeHtml(item.description || '')}</td>
            <td>${qty}</td>
            <td>${formatINR(rate)}</td>
            <td>${tax}%</td>
            <td>${formatINR(amount)}</td>
          </tr>
        `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: ${theme.page};
      color: ${theme.text};
      font-family: ${theme.font};
      font-size: 12px;
      line-height: 1.45;
    }
    .page { padding: 32px 38px; background: ${theme.page}; }
    .topbar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 28px;
      align-items: start;
      margin-bottom: 22px;
      border-bottom: 2px solid ${theme.primary};
      padding-bottom: 18px;
    }
    .brand-logo { max-width: 112px; max-height: 68px; object-fit: contain; display: block; margin-bottom: 10px; }
    .business-name { font-size: 24px; font-weight: 800; letter-spacing: 0; margin: 0 0 6px; color: ${theme.primary}; }
    .muted { color: ${theme.muted}; margin: 2px 0; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { margin: 0 0 8px; font-size: 34px; letter-spacing: 2px; color: ${theme.primary}; }
    .invoice-title p { margin: 3px 0; color: ${theme.muted}; }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 24px;
    }
    .section-label {
      margin: 0 0 8px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: ${theme.muted};
      font-weight: 800;
    }
    .detail-card {
      border-left: 3px solid ${theme.primary};
      padding-left: 12px;
      min-height: 82px;
      background: ${theme.card};
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .detail-card strong { display: block; font-size: 15px; color: ${theme.text}; margin-bottom: 4px; }
    .detail-card p { margin: 2px 0; color: ${theme.muted}; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 28px; }
    thead { background: ${theme.primary}; color: #ffffff; }
    th { padding: 11px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .7px; }
    td { padding: 11px 10px; border-bottom: 1px solid ${theme.line}; vertical-align: top; }
    th:nth-child(1), td:nth-child(1), th:nth-child(3), td:nth-child(3), th:nth-child(5), td:nth-child(5) { text-align: center; }
    th:nth-child(4), td:nth-child(4), th:nth-child(6), td:nth-child(6) { text-align: right; }
    .description { width: 42%; }
    .bottom {
      display: grid;
      grid-template-columns: ${hasSidebarContent ? '210px 1fr' : '1fr'};
      gap: 30px;
      align-items: stretch;
      margin-top: 18px;
    }
    .dark-panel {
      background: ${theme.primary};
      color: #f9fafb;
      min-height: 190px;
      padding: 24px 22px;
    }
    .dark-panel h3 { margin: 0 0 9px; font-size: 12px; letter-spacing: .8px; text-transform: uppercase; }
    .dark-panel p { margin: 2px 0; color: #e5e7eb; font-size: 11px; }
    .dark-panel .rule { height: 1px; background: rgba(255,255,255,.55); margin: 18px 0; }
    .summary { padding-top: 2px; }
    .payment { min-height: 72px; margin-bottom: 16px; }
    .payment h3 { margin: 0 0 8px; font-size: 12px; letter-spacing: .8px; text-transform: uppercase; color: ${theme.text}; }
    .payment p { margin: 2px 0; color: ${theme.muted}; font-size: 11px; }
    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid ${theme.line};
      color: ${theme.muted};
      font-weight: 700;
    }
    .grand-total {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 0 26px;
      font-size: 17px;
      color: ${theme.text};
      font-weight: 900;
    }
    .signature { margin-top: 18px; width: 210px; border-top: 1px solid ${theme.text}; padding-top: 9px; font-weight: 800; letter-spacing: .4px; }
    .footer { margin-top: 20px; color: #9ca3af; font-size: 10px; text-align: center; }
  </style>
</head>
<body>
  <main class="page">
    <section class="topbar">
      <div>
        ${buildLogoMarkup(businessProfile.logoUrl)}
        <h1 class="business-name">${escapeHtml(businessName)}</h1>
      </div>
      <div class="invoice-title">
        <h2>INVOICE</h2>
        ${invoiceData.number ? `<p><strong>${escapeHtml(invoiceData.number)}</strong></p>` : ''}
        ${invoiceData.date ? `<p>Date: ${escapeHtml(invoiceData.date)}</p>` : ''}
        ${invoiceData.dueDate ? `<p>Due: ${escapeHtml(invoiceData.dueDate)}</p>` : ''}
        ${invoiceData.status ? `<p>Status: ${escapeHtml(invoiceData.status)}</p>` : ''}
      </div>
    </section>

    <section class="details-grid">
      <div class="detail-card">
        <p class="section-label">From</p>
        <strong>${escapeHtml(businessName)}</strong>
        ${businessProfile.address ? `<p>${escapeHtml(businessProfile.address)}</p>` : ''}
        ${businessContact ? `<p>${escapeHtml(businessContact)}</p>` : ''}
        ${businessTax ? `<p>${escapeHtml(businessTax)}</p>` : ''}
      </div>
      <div class="detail-card">
        <p class="section-label">Billed To</p>
        ${invoiceData.clientName ? `<strong>${escapeHtml(invoiceData.clientName)}</strong>` : ''}
        ${clientCompany ? `<p>${escapeHtml(clientCompany)}</p>` : ''}
        ${clientGst ? `<p>GST: ${escapeHtml(clientGst)}</p>` : ''}
        ${clientAddress ? `<p>${escapeHtml(clientAddress)}</p>` : ''}
      </div>
    </section>

    <table>
      <thead>
        <tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Tax</th><th>Amount</th></tr>
      </thead>
      <tbody>${itemRows || '<tr><td colspan="6"></td></tr>'}</tbody>
    </table>

    <section class="bottom">
      ${hasSidebarContent ? `<aside class="dark-panel">
        ${notes ? `<h3>Notes</h3><p>${escapeHtml(notes)}</p>` : ''}
        ${notes && terms ? '<div class="rule"></div>' : ''}
        ${terms ? `<h3>Terms & Conditions</h3><p>${escapeHtml(terms)}</p>` : ''}
      </aside>` : ''}
      <section class="summary">
        ${bankRows ? `<div class="payment">
          <h3>Payment Info</h3>
          ${bankRows}
        </div>` : ''}
        <div class="total-row"><span>Sub Total:</span><span>${formatINR(invoiceData.subtotal)}</span></div>
        <div class="total-row"><span>Tax:</span><span>${formatINR(invoiceData.taxTotal)}</span></div>
        <div class="grand-total"><span>Total:</span><span>${formatINR(invoiceData.total)}</span></div>
        <div class="signature">Authorised Sign</div>
      </section>
    </section>
    <p class="footer">Generated by VoicedIn</p>
  </main>
</body>
</html>`;
}

function getTemplateTheme(templateId = 'modern') {
    const themes = {
        modern: {
            primary: '#4f46e5',
            page: '#ffffff',
            card: '#f8fafc',
            text: '#111827',
            muted: '#4b5563',
            line: '#e5e7eb',
            font: 'Inter, "Segoe UI", Arial, sans-serif',
        },
        classic: {
            primary: '#111827',
            page: '#ffffff',
            card: '#ffffff',
            text: '#111827',
            muted: '#4b5563',
            line: '#d1d5db',
            font: 'Georgia, "Times New Roman", serif',
        },
        minimal: {
            primary: '#0f172a',
            page: '#ffffff',
            card: '#ffffff',
            text: '#0f172a',
            muted: '#64748b',
            line: '#e2e8f0',
            font: '"Segoe UI", Arial, sans-serif',
        },
        elegant: {
            primary: '#7c3aed',
            page: '#fdfcff',
            card: '#f5f3ff',
            text: '#1f1633',
            muted: '#5b5368',
            line: '#ddd6fe',
            font: 'Georgia, "Times New Roman", serif',
        },
        bold: {
            primary: '#047857',
            page: '#fbfffd',
            card: '#ecfdf5',
            text: '#052e2b',
            muted: '#31534c',
            line: '#bbf7d0',
            font: '"Segoe UI", Arial, sans-serif',
        },
    };

    return themes[templateId] || themes.modern;
}

function buildFallbackPdf(invoiceData, businessProfile, isDemo) {
    const pages = [];
    const fonts = {
        regular: 'F1',
        bold: 'F2',
    };

    let page = createPage();
    pages.push(page);

    page.cursorY = drawPrimaryHeader(page, invoiceData, businessProfile, isDemo, fonts);
    page.cursorY = drawSectionHeader(page, page.cursorY, 'From', fonts.bold);
    page.cursorY = drawText(page, safeText(businessProfile?.businessName || businessProfile?.name || 'VoicedIn'), PAGE_MARGIN, page.cursorY, 11, fonts.regular);
    if (businessProfile?.address) {
        page.cursorY = drawParagraph(page, businessProfile.address, PAGE_MARGIN, page.cursorY, 10, fonts.regular, 320);
    }
    if (businessProfile?.email || businessProfile?.phone) {
        page.cursorY = drawText(page, safeText([businessProfile.email, businessProfile.phone].filter(Boolean).join(' | ')), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
    }
    if (businessProfile?.gst || businessProfile?.panNumber) {
        page.cursorY = drawText(page, safeText([businessProfile.gst ? `GST: ${businessProfile.gst}` : '', businessProfile.panNumber ? `PAN: ${businessProfile.panNumber}` : ''].filter(Boolean).join(' | ')), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
    }
    page.cursorY -= 8;

    page.cursorY = drawSectionHeader(page, page.cursorY, 'Billed To', fonts.bold);
    if (invoiceData.clientName) {
        page.cursorY = drawText(page, safeText(invoiceData.clientName), PAGE_MARGIN, page.cursorY, 11, fonts.regular);
    }
    const clientCompany = invoiceData.clientCompanyName || invoiceData.company || invoiceData.clientDetails?.companyName;
    if (clientCompany) {
        page.cursorY = drawText(page, safeText(clientCompany), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
    }
    if (invoiceData.clientGstNumber || invoiceData.clientDetails?.gstNumber) {
        page.cursorY = drawText(page, safeText(`GST: ${invoiceData.clientGstNumber || invoiceData.clientDetails?.gstNumber}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
    }
    if (invoiceData.clientAddress || invoiceData.clientDetails?.address) {
        page.cursorY = drawParagraph(page, invoiceData.clientAddress || invoiceData.clientDetails?.address, PAGE_MARGIN, page.cursorY, 10, fonts.regular, 320);
    }
    page.cursorY -= 10;
    page.cursorY = drawTableHeader(page, page.cursorY, fonts.bold);

    const items = invoiceData.items || [];
    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const rowHeight = estimateRowHeight(item);

        if (page.cursorY - rowHeight < PAGE_MARGIN + 130) {
            page = createPage();
            pages.push(page);
            page.cursorY = drawContinuationHeader(page, invoiceData, businessProfile, fonts);
            page.cursorY = drawTableHeader(page, page.cursorY, fonts.bold);
        }

        page.cursorY = drawItemRow(page, index, item, page.cursorY, fonts.regular);
    }

    if (page.cursorY - 90 < PAGE_MARGIN) {
        page = createPage();
        pages.push(page);
        page.cursorY = drawContinuationHeader(page, invoiceData, businessProfile, fonts);
    }

    page.cursorY -= 6;
    page.cursorY = drawTotals(page, invoiceData, page.cursorY, fonts);

    if (hasBankDetails(businessProfile)) {
        if (page.cursorY - 74 < PAGE_MARGIN) {
            page = createPage();
            pages.push(page);
            page.cursorY = drawContinuationHeader(page, invoiceData, businessProfile, fonts);
        }

        page.cursorY -= 8;
        page.cursorY = drawSectionHeader(page, page.cursorY, 'Payment Info', fonts.bold);
        if (businessProfile.bankAccountName) {
            page.cursorY = drawText(page, safeText(`Account: ${businessProfile.bankAccountName}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
        }
        if (businessProfile.bankName) {
            page.cursorY = drawText(page, safeText(`Bank: ${businessProfile.bankName}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
        }
        if (businessProfile.bankAccountNumber) {
            page.cursorY = drawText(page, safeText(`A/C No: ${businessProfile.bankAccountNumber}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
        }
        if (businessProfile.bankIfsc) {
            page.cursorY = drawText(page, safeText(`IFSC: ${businessProfile.bankIfsc}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
        }
        if (businessProfile.bankUpi) {
            page.cursorY = drawText(page, safeText(`UPI: ${businessProfile.bankUpi}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
        }
    }

    if (invoiceData.notes || invoiceData.terms) {
        if (page.cursorY - 64 < PAGE_MARGIN) {
            page = createPage();
            pages.push(page);
            page.cursorY = drawContinuationHeader(page, invoiceData, businessProfile, fonts);
        }

        page.cursorY -= 8;
        page.cursorY = drawSectionHeader(page, page.cursorY, 'Notes', fonts.bold);
        if (invoiceData.notes) {
            page.cursorY = drawParagraph(page, invoiceData.notes, PAGE_MARGIN, page.cursorY, 10, fonts.regular, 82);
        }
        if (invoiceData.terms) {
            page.cursorY -= 4;
            page.cursorY = drawSectionHeader(page, page.cursorY, 'Terms', fonts.bold);
            page.cursorY = drawParagraph(page, invoiceData.terms, PAGE_MARGIN, page.cursorY, 10, fonts.regular, 82);
        }
    }

    return assemblePdf(pages);
}

function createPage() {
    return {
        content: [],
        cursorY: A4_HEIGHT - PAGE_MARGIN,
    };
}

function drawPrimaryHeader(page, invoiceData, businessProfile, isDemo, fonts) {
    drawText(page, 'INVOICE', 408, A4_HEIGHT - PAGE_MARGIN, 20, fonts.bold);
    let detailY = A4_HEIGHT - PAGE_MARGIN - 26;
    if (invoiceData.number) {
        detailY = drawText(page, safeText(`Invoice No: ${invoiceData.number}`), 408, detailY, 10, fonts.regular);
    }
    if (invoiceData.date) {
        detailY = drawText(page, safeText(`Date: ${invoiceData.date}`), 408, detailY, 10, fonts.regular);
    }
    if (invoiceData.dueDate) {
        detailY = drawText(page, safeText(`Due: ${invoiceData.dueDate}`), 408, detailY, 10, fonts.regular);
    }
    if (invoiceData.status) {
        drawText(page, safeText(`Status: ${invoiceData.status}`), 408, detailY, 10, fonts.regular);
    }

    if (isDemo) {
        drawText(page, 'DEMO - NOT VALID', 408, A4_HEIGHT - PAGE_MARGIN - 74, 10, fonts.bold);
    }

    drawRule(page, PAGE_MARGIN, A4_HEIGHT - 120, A4_WIDTH - PAGE_MARGIN);

    let cursorY = A4_HEIGHT - 146;
    return cursorY;
}

function drawContinuationHeader(page, invoiceData, businessProfile, fonts) {
    let y = A4_HEIGHT - PAGE_MARGIN;
    y = drawText(page, safeText(businessProfile?.businessName || 'VoicedIn'), PAGE_MARGIN, y, 16, fonts.bold);
    if (invoiceData.number) {
        y = drawText(page, safeText(`Invoice: ${invoiceData.number}`), PAGE_MARGIN, y, 10, fonts.regular);
    }
    y = drawText(page, 'Continued', PAGE_MARGIN, y, 10, fonts.bold);
    drawRule(page, PAGE_MARGIN, y - 10, A4_WIDTH - PAGE_MARGIN);
    return y - 24;
}

function drawSectionHeader(page, y, label, font) {
    drawText(page, safeText(label), PAGE_MARGIN, y, 12, font);
    return y - 18;
}

function drawTableHeader(page, y, fonts) {
    drawRule(page, PAGE_MARGIN, y + 4, A4_WIDTH - PAGE_MARGIN);
    drawText(page, '#', PAGE_MARGIN, y, 10, fonts);
    drawText(page, 'Description', PAGE_MARGIN + 28, y, 10, fonts);
    drawText(page, 'Qty', 305, y, 10, fonts);
    drawText(page, 'Rate', 348, y, 10, fonts);
    drawText(page, 'Tax', 420, y, 10, fonts);
    drawText(page, 'Amount', 476, y, 10, fonts);
    drawRule(page, PAGE_MARGIN, y - 8, A4_WIDTH - PAGE_MARGIN);
    return y - 24;
}

function drawItemRow(page, index, item, y, font) {
    const descriptionLines = wrapText(safeText(item?.description || ''), 42);
    const rowHeight = Math.max(descriptionLines.length * 12 + 8, 20);
    const amount = Number(item?.qty || 0) * Number(item?.rate || 0) * (1 + Number(item?.tax || 0) / 100);

    drawText(page, String(index + 1), PAGE_MARGIN, y, 10, font);
    descriptionLines.forEach((line, lineIndex) => {
        drawText(page, line, PAGE_MARGIN + 28, y - (lineIndex * 12), 10, font);
    });
    drawText(page, String(item?.qty ?? 0), 305, y, 10, font);
    drawText(page, formatFallbackMoney(item?.rate), 348, y, 10, font);
    drawText(page, `${Number(item?.tax || 0)}%`, 420, y, 10, font);
    drawText(page, formatFallbackMoney(amount), 476, y, 10, font);

    drawRule(page, PAGE_MARGIN, y - rowHeight + 2, A4_WIDTH - PAGE_MARGIN);
    return y - rowHeight;
}

function drawTotals(page, invoiceData, y, fonts) {
    drawRule(page, 330, y + 4, A4_WIDTH - PAGE_MARGIN);
    y -= 10;
    y = drawAmountRow(page, 'Subtotal', formatFallbackMoney(invoiceData.subtotal), y, fonts.regular, fonts.bold);
    y = drawAmountRow(page, 'Tax', formatFallbackMoney(invoiceData.taxTotal), y, fonts.regular, fonts.bold);
    y = drawAmountRow(page, 'Total', formatFallbackMoney(invoiceData.total), y, fonts.bold, fonts.bold, true);
    return y - 12;
}

function drawAmountRow(page, label, value, y, labelFont, valueFont, emphasize = false) {
    drawText(page, safeText(label), 360, y, emphasize ? 12 : 10, labelFont);
    drawText(page, safeText(value), 476, y, emphasize ? 12 : 10, valueFont);
    return y - 16;
}

function drawParagraph(page, text, x, y, size, font, maxWidth) {
    const lines = wrapText(safeText(text), Math.max(18, Math.floor(maxWidth / 5.5)));
    lines.forEach(line => {
        y = drawText(page, line, x, y, size, font);
    });
    return y - 2;
}

function drawText(page, text, x, y, size, font) {
    page.content.push(textCommand(text, x, y, size, font));
    return y - Math.max(12, size + 4);
}

function drawRule(page, x1, y, x2) {
    page.content.push(`q 0.5 w ${x1} ${y} m ${x2} ${y} l S Q`);
}

function textCommand(text, x, y, size, font) {
    return `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`;
}

function escapePdfText(value) {
    return String(value ?? '')
        .replace(/\r?\n/g, ' ')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u20B9/g, 'Rs.')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\u2022/g, '*')
        .replace(/[^\x20-\x7E]/g, '?')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

function safeText(value) {
    return String(value ?? '').replace(/\r?\n/g, ' ');
}

function wrapText(text, maxChars) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];

    const lines = [];
    let current = '';

    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length <= maxChars) {
            current = next;
            continue;
        }

        if (current) {
            lines.push(current);
        }

        if (word.length > maxChars) {
            const chunks = word.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [word];
            lines.push(...chunks.slice(0, -1));
            current = chunks[chunks.length - 1];
        } else {
            current = word;
        }
    }

    if (current) {
        lines.push(current);
    }

    return lines.length ? lines : [''];
}

function estimateRowHeight(item) {
    const lines = wrapText(safeText(item?.description || ''), 42);
    return Math.max(lines.length * 12 + 8, 20);
}

function formatFallbackMoney(amount) {
    const value = Number(amount || 0);
    return `Rs. ${new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value)}`;
}

function assemblePdf(pages) {
    const objects = [];
    const addObject = (body) => {
        objects.push(body);
    };

    addObject('<< /Type /Catalog /Pages 2 0 R >>');
    addObject(`<< /Type /Pages /Kids [${pages.map((_, index) => `${6 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);
    addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    pages.forEach((page, index) => {
        const content = `${page.content.join('\n')}\n`;
        const contentLength = Buffer.byteLength(content, 'latin1');
        addObject(`<< /Length ${contentLength} >>\nstream\n${content}endstream`);
        addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5 + index * 2} 0 R >>`);
    });

    const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const objectStrings = objects.map((body, index) => `${index + 1} 0 obj\n${body}\nendobj\n`);

    let offset = Buffer.byteLength(header, 'latin1');
    const offsets = [0];

    for (const objectString of objectStrings) {
        offsets.push(offset);
        offset += Buffer.byteLength(objectString, 'latin1');
    }

    const xrefStart = offset;
    const xrefLines = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];
    for (let i = 1; i < offsets.length; i += 1) {
        xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
    }

    const trailer = [
        'trailer',
        `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
        'startxref',
        String(xrefStart),
        '%%EOF',
    ].join('\n');

    const pdfText = [
        header,
        ...objectStrings,
        `${xrefLines.join('\n')}\n`,
        `${trailer}\n`,
    ].join('');

    return Buffer.from(pdfText, 'latin1');
}

function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount || 0);
}

function buildLogoMarkup(logoUrl) {
    const src = resolveLogoSource(logoUrl);
    return src ? `<img class="brand-logo" src="${src}" alt="Company logo" />` : '';
}

function buildBankDetailsRows(profile = {}) {
    if (!hasBankDetails(profile)) return '';

    return [
        profile.bankAccountName ? `<p><strong>Account:</strong> ${escapeHtml(profile.bankAccountName)}</p>` : '',
        profile.bankName ? `<p><strong>Bank:</strong> ${escapeHtml(profile.bankName)}</p>` : '',
        profile.bankAccountNumber ? `<p><strong>A/C No:</strong> ${escapeHtml(profile.bankAccountNumber)}</p>` : '',
        profile.bankIfsc ? `<p><strong>IFSC:</strong> ${escapeHtml(profile.bankIfsc)}</p>` : '',
        profile.bankUpi ? `<p><strong>UPI:</strong> ${escapeHtml(profile.bankUpi)}</p>` : '',
    ].filter(Boolean).join('');
}

function hasBankDetails(profile = {}) {
    return Boolean(
        profile.includeBankDetails &&
        (profile.bankAccountName || profile.bankName || profile.bankAccountNumber || profile.bankIfsc || profile.bankUpi)
    );
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resolveLogoSource(logoUrl) {
    if (!logoUrl) return '';
    if (/^https?:\/\//i.test(logoUrl) || logoUrl.startsWith('data:')) {
        return logoUrl;
    }

    if (!logoUrl.startsWith('/uploads/')) {
        return '';
    }

    const relativePath = logoUrl.replace(/^\/uploads\//, '');
    const logoPath = path.join(__dirname, '..', '..', config.uploadDir, relativePath);
    if (!fs.existsSync(logoPath)) {
        return '';
    }

    const ext = path.extname(logoPath).toLowerCase();
    const mime = ext === '.svg'
        ? 'image/svg+xml'
        : ext === '.webp'
            ? 'image/webp'
            : ext === '.jpg' || ext === '.jpeg'
                ? 'image/jpeg'
                : 'image/png';

    return `data:${mime};base64,${fs.readFileSync(logoPath).toString('base64')}`;
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
    throw new Error('PDF generator returned an unsupported binary type');
}

function validatePdfBuffer(buffer, label) {
    const pdfBuffer = toBuffer(buffer);
    if (pdfBuffer.length === 0) {
        throw new Error(`${label} is empty`);
    }
    const header = pdfBuffer.subarray(0, 5).toString('ascii');
    if (header !== '%PDF-') {
        throw new Error(`${label} is not a valid PDF buffer`);
    }
}

function verifySavedPdf(filePath, label) {
    const savedBuffer = fs.readFileSync(filePath);
    validatePdfBuffer(savedBuffer, `${label} saved file`);
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[invoice-pdf] verified ${filePath} (${savedBuffer.length} bytes, header=${savedBuffer.subarray(0, 5).toString('ascii')})`);
    }
}
