import * as exportService from '../services/exportService.js';
import path, { dirname } from 'path';
import config from '../config/index.js';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { AppError, NotFoundError } from '../utils/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function exportCSV(req, res, next) {
    try {
        const result = await exportService.exportCSV(req.user.id, req.body);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
}

export async function exportExcel(req, res, next) {
    try {
        const result = await exportService.exportExcel(req.user.id, req.body);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
}

export async function exportPDF(req, res, next) {
    try {
        const result = await exportService.exportPDF(req.user.id, req.body);
        res.json({
            success: true,
            ...result,
            downloadUrl: result.url,
            filename: result.fileName,
        });
    } catch (err) { next(err); }
}

export async function downloadExport(req, res, next) {
    try {
        const fileName = path.basename(req.params.filename);
        if (fileName !== req.params.filename) {
            throw new AppError('Invalid export filename', 400);
        }

        const filePath = path.join(__dirname, '..', '..', config.uploadDir, 'exports', fileName);
        if (!fs.existsSync(filePath)) {
            throw new NotFoundError('Export file');
        }

        const fileBuffer = fs.readFileSync(filePath);
        const contentType = contentTypeFor(fileName);
        validateExportBuffer(fileBuffer, fileName);

        res.status(200);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', String(fileBuffer.length));
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[export:download] ${fileName} bytes=${fileBuffer.length} type=${contentType}`);
        }

        return res.end(fileBuffer);
    } catch (err) { next(err); }
}

function contentTypeFor(fileName) {
    const extension = path.extname(fileName).toLowerCase();
    if (extension === '.pdf') return 'application/pdf';
    if (extension === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (extension === '.csv') return 'text/csv; charset=utf-8';
    return 'application/octet-stream';
}

function validateExportBuffer(buffer, fileName) {
    if (!buffer.length) {
        throw new AppError('Export file is empty', 500);
    }

    const extension = path.extname(fileName).toLowerCase();
    if (extension === '.pdf' && buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new AppError('Export PDF is invalid', 500);
    }
    if (extension === '.xlsx' && buffer.subarray(0, 2).toString('ascii') !== 'PK') {
        throw new AppError('Export Excel file is invalid', 500);
    }
    if (extension === '.csv') {
        const csvText = buffer.toString('utf8').replace(/^\uFEFF/, '');
        if (!csvText.startsWith('"Invoice Number"')) {
            throw new AppError('Export CSV file is invalid', 500);
        }
    }
}
