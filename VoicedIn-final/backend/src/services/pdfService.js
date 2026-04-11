import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const PAGE_MARGIN = 42;

function resolveBrowserExecutablePath() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

    const candidates = [
        path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ];

    return candidates.find(candidate => candidate && fs.existsSync(candidate)) || null;
}

export async function generatePDF(invoiceData, businessProfile, templateId = 'modern', isDemo = false) {
    const templatePath = path.join(__dirname, '..', 'templates', 'invoice', `${templateId}.html`);
    let html;

    try {
        html = fs.readFileSync(templatePath, 'utf-8');
    } catch {
        html = fs.readFileSync(path.join(__dirname, '..', 'templates', 'invoice', 'modern.html'), 'utf-8');
    }

    html = prepareTemplateLayout(html, businessProfile);

    html = html
        .replace(/\{\{logoMarkup\}\}/g, buildLogoMarkup(businessProfile?.logoUrl))
        .replace(/\{\{businessName\}\}/g, businessProfile?.businessName || 'Your Business')
        .replace(/\{\{businessAddress\}\}/g, businessProfile?.address || '')
        .replace(/\{\{businessEmail\}\}/g, businessProfile?.email || '')
        .replace(/\{\{businessPhone\}\}/g, businessProfile?.phone || '')
        .replace(/\{\{businessGST\}\}/g, businessProfile?.gst || '')
        .replace(/\{\{logoUrl\}\}/g, businessProfile?.logoUrl || '')
        .replace(/\{\{invoiceNumber\}\}/g, invoiceData.number || '')
        .replace(/\{\{invoiceDate\}\}/g, invoiceData.date || '')
        .replace(/\{\{dueDate\}\}/g, invoiceData.dueDate || '')
        .replace(/\{\{clientName\}\}/g, invoiceData.clientName || '')
        .replace(/\{\{clientCompany\}\}/g, invoiceData.clientCompanyName || invoiceData.company || invoiceData.clientDetails?.companyName || '')
        .replace(/\{\{clientGstNumber\}\}/g, invoiceData.clientGstNumber || invoiceData.clientDetails?.gstNumber || '')
        .replace(/\{\{clientAddress\}\}/g, invoiceData.clientAddress || invoiceData.clientDetails?.address || '')
        .replace(/\{\{subtotal\}\}/g, formatINR(invoiceData.subtotal))
        .replace(/\{\{taxTotal\}\}/g, formatINR(invoiceData.taxTotal))
        .replace(/\{\{total\}\}/g, formatINR(invoiceData.total))
        .replace(/\{\{notes\}\}/g, invoiceData.notes || '')
        .replace(/\{\{terms\}\}/g, invoiceData.terms || '');

    const itemRows = (invoiceData.items || []).map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.description}</td>
      <td>${item.qty}</td>
      <td>${formatINR(item.rate)}</td>
      <td>${item.tax}%</td>
      <td>${formatINR(item.qty * item.rate * (1 + item.tax / 100))}</td>
    </tr>
  `).join('');
    html = html.replace('{{itemRows}}', itemRows);
    html = html.replace('{{bankDetailsBlock}}', buildBankDetailsHtml(businessProfile));

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

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[invoice-pdf] saved ${pdfPath} (${pdfBuffer.length} bytes, browser)`);
        }

        return {
            pdfUrl: `/uploads/invoices/${fileName}`,
            pdfPath,
            buffer: pdfBuffer,
        };
    } catch (browserErr) {
        const pdfBuffer = buildFallbackPdf(invoiceData, businessProfile, isDemo);
        validatePdfBuffer(pdfBuffer, 'Invoice PDF fallback');
        fs.writeFileSync(pdfPath, pdfBuffer);
        verifySavedPdf(pdfPath, 'Invoice PDF fallback');

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[invoice-pdf] saved ${pdfPath} (${pdfBuffer.length} bytes, fallback: ${browserErr.message})`);
        }

        return {
            pdfUrl: `/uploads/invoices/${fileName}`,
            pdfPath,
            buffer: pdfBuffer,
            fallback: true,
            fallbackReason: browserErr.message,
        };
    }
}

async function generateBrowserPdf(html) {
    const puppeteer = await import('puppeteer');
    const launchOptions = {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };

    const executablePath = resolveBrowserExecutablePath();
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

function prepareTemplateLayout(html, businessProfile) {
    let nextHtml = html
        .replace('</style>', `
    .brand-logo { max-width: 112px; max-height: 72px; object-fit: contain; display: block; margin-bottom: 10px; }
    .details-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin: 0 0 24px; }
    .details-card h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; color: #475569; }
    .details-card p { color: #334155; font-size: 12px; line-height: 1.5; margin-top: 2px; }
  </style>`)
        .replace(/<h1>\{\{businessName\}\}<\/h1>/, '{{logoMarkup}}<p><strong>Our Details</strong></p><h1>{{businessName}}</h1>')
        .replace(/<h3>Bill To<\/h3>/g, '<h3>Billed To</h3>');

    if (!nextHtml.includes('{{bankDetailsBlock}}')) {
        nextHtml = nextHtml.replace(/<table>/, '{{bankDetailsBlock}}\n  <table>');
    }

    if (!hasBankDetails(businessProfile)) {
        nextHtml = nextHtml.replace('{{bankDetailsBlock}}', '');
    }

    return nextHtml;
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
    page.cursorY = drawSectionHeader(page, page.cursorY, 'Billed To', fonts.bold);
    page.cursorY = drawText(page, safeText(invoiceData.clientName || 'Client Name'), PAGE_MARGIN, page.cursorY, 11, fonts.regular);
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
    if (hasBankDetails(businessProfile)) {
        page.cursorY = drawSectionHeader(page, page.cursorY, 'Bank Account Details', fonts.bold);
        if (businessProfile.bankAccountName) {
            page.cursorY = drawText(page, safeText(`Account Name: ${businessProfile.bankAccountName}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
        }
        if (businessProfile.bankName) {
            page.cursorY = drawText(page, safeText(`Bank: ${businessProfile.bankName}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
        }
        if (businessProfile.bankAccountNumber) {
            page.cursorY = drawText(page, safeText(`Account No: ${businessProfile.bankAccountNumber}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
        }
        if (businessProfile.bankIfsc) {
            page.cursorY = drawText(page, safeText(`IFSC: ${businessProfile.bankIfsc}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
        }
        if (businessProfile.bankUpi) {
            page.cursorY = drawText(page, safeText(`UPI: ${businessProfile.bankUpi}`), PAGE_MARGIN, page.cursorY, 10, fonts.regular);
        }
        page.cursorY -= 8;
    }
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
    let y = A4_HEIGHT - PAGE_MARGIN;
    const businessName = safeText(businessProfile?.businessName || 'Your Business');

    y = drawText(page, 'Our Details', PAGE_MARGIN, y, 10, fonts.bold);
    y = drawText(page, businessName, PAGE_MARGIN, y, 18, fonts.bold);
    if (businessProfile?.address) {
        y = drawText(page, safeText(businessProfile.address), PAGE_MARGIN, y, 10, fonts.regular);
    }
    if (businessProfile?.email || businessProfile?.phone) {
        y = drawText(page, safeText([businessProfile.email, businessProfile.phone].filter(Boolean).join(' | ')), PAGE_MARGIN, y, 10, fonts.regular);
    }
    if (businessProfile?.gst) {
        y = drawText(page, safeText(`GST: ${businessProfile.gst}`), PAGE_MARGIN, y, 10, fonts.regular);
    }

    drawText(page, 'INVOICE', 408, A4_HEIGHT - PAGE_MARGIN, 20, fonts.bold);
    y = drawText(page, safeText(`Invoice No: ${invoiceData.number || ''}`), 408, A4_HEIGHT - PAGE_MARGIN - 26, 11, fonts.regular);
    y = drawText(page, safeText(`Date: ${invoiceData.date || ''}`), 408, A4_HEIGHT - PAGE_MARGIN - 42, 10, fonts.regular);
    y = drawText(page, safeText(`Due: ${invoiceData.dueDate || ''}`), 408, A4_HEIGHT - PAGE_MARGIN - 56, 10, fonts.regular);

    if (isDemo) {
        drawText(page, 'DEMO - NOT VALID', 408, A4_HEIGHT - PAGE_MARGIN - 74, 10, fonts.bold);
    }

    drawRule(page, PAGE_MARGIN, A4_HEIGHT - 120, A4_WIDTH - PAGE_MARGIN);

    let cursorY = A4_HEIGHT - 146;
    cursorY = drawSectionHeader(page, cursorY, 'Bill To', fonts.bold);
    return cursorY;
}

function drawContinuationHeader(page, invoiceData, businessProfile, fonts) {
    let y = A4_HEIGHT - PAGE_MARGIN;
    y = drawText(page, safeText(businessProfile?.businessName || 'Your Business'), PAGE_MARGIN, y, 16, fonts.bold);
    y = drawText(page, safeText(`Invoice: ${invoiceData.number || ''}`), PAGE_MARGIN, y, 10, fonts.regular);
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
    const descriptionLines = wrapText(safeText(item?.description || 'Item'), 42);
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
    const lines = wrapText(safeText(item?.description || 'Item'), 42);
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

function buildBankDetailsHtml(profile = {}) {
    if (!hasBankDetails(profile)) {
        return '';
    }

    return `
  <div class="details-card">
    <h3>Bank Account Details</h3>
    ${profile.bankAccountName ? `<p><strong>Account Name:</strong> ${profile.bankAccountName}</p>` : ''}
    ${profile.bankName ? `<p><strong>Bank:</strong> ${profile.bankName}</p>` : ''}
    ${profile.bankAccountNumber ? `<p><strong>Account No:</strong> ${profile.bankAccountNumber}</p>` : ''}
    ${profile.bankIfsc ? `<p><strong>IFSC:</strong> ${profile.bankIfsc}</p>` : ''}
    ${profile.bankUpi ? `<p><strong>UPI:</strong> ${profile.bankUpi}</p>` : ''}
  </div>`;
}

function hasBankDetails(profile = {}) {
    return Boolean(
        profile.includeBankDetails &&
        (profile.bankAccountName || profile.bankName || profile.bankAccountNumber || profile.bankIfsc || profile.bankUpi)
    );
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
