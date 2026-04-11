import * as exportService from '../services/exportService.js';
import path from 'path';

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
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
}

export async function downloadExport(req, res, next) {
    try {
        const filePath = path.resolve('uploads', 'exports', req.params.filename);
        res.download(filePath);
    } catch (err) { next(err); }
}
