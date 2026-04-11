import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function generatePDF(invoiceData, businessProfile, templateId = 'modern', isDemo = false) {
    const templatePath = path.join(__dirname, '..', 'templates', 'invoice', `${templateId}.html`);
    let html;

    try {
        html = fs.readFileSync(templatePath, 'utf-8');
    } catch {
        // Fallback to modern template
        html = fs.readFileSync(path.join(__dirname, '..', 'templates', 'invoice', 'modern.html'), 'utf-8');
    }

    // Replace template variables
    html = html
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
        .replace(/\{\{clientCompany\}\}/g, invoiceData.company || '')
        .replace(/\{\{subtotal\}\}/g, formatINR(invoiceData.subtotal))
        .replace(/\{\{taxTotal\}\}/g, formatINR(invoiceData.taxTotal))
        .replace(/\{\{total\}\}/g, formatINR(invoiceData.total))
        .replace(/\{\{notes\}\}/g, invoiceData.notes || '')
        .replace(/\{\{terms\}\}/g, invoiceData.terms || '');

    // Build items table rows
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

    // Demo watermark
    if (isDemo) {
        html = html.replace('</body>', `
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:100px;color:rgba(200,0,0,0.1);font-weight:bold;z-index:9999;pointer-events:none;">
        DEMO — NOT VALID
      </div>
    </body>`);
    }

    // Try Puppeteer; if not available, return HTML
    try {
        const puppeteer = await import('puppeteer');
        const browser = await puppeteer.default.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
            printBackground: true,
        });
        await browser.close();

        // Save PDF
        const fileName = `invoice-${invoiceData.number || Date.now()}.pdf`;
        const pdfDir = path.join(__dirname, '..', '..', config.uploadDir, 'invoices');
        if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
        const pdfPath = path.join(pdfDir, fileName);
        fs.writeFileSync(pdfPath, pdfBuffer);

        return {
            pdfUrl: `/uploads/invoices/${fileName}`,
            pdfPath,
            buffer: pdfBuffer,
        };
    } catch (err) {
        console.warn('Puppeteer not available, returning HTML:', err.message);
        // Return HTML as fallback
        const fileName = `invoice-${invoiceData.number || Date.now()}.html`;
        const htmlDir = path.join(__dirname, '..', '..', config.uploadDir, 'invoices');
        if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true });
        const htmlPath = path.join(htmlDir, fileName);
        fs.writeFileSync(htmlPath, html);
        return { pdfUrl: `/uploads/invoices/${fileName}`, htmlPath, html };
    }
}

function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount || 0);
}
