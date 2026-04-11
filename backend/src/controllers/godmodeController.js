import * as godmodeService from '../services/godmodeService.js';

export async function listPaymentRequests(req, res, next) {
    try {
        const requests = await godmodeService.listPremiumPaymentRequests(req.query.status || 'pending');
        res.json({ success: true, requests });
    } catch (err) { next(err); }
}

export async function approvePaymentRequest(req, res, next) {
    try {
        const request = await godmodeService.approvePremiumPaymentRequest(req.params.id, req.body?.approvedBy || 'godmode');
        res.json({ success: true, request });
    } catch (err) { next(err); }
}

export async function rejectPaymentRequest(req, res, next) {
    try {
        const request = await godmodeService.rejectPremiumPaymentRequest(req.params.id, req.body?.approvedBy || 'godmode');
        res.json({ success: true, request });
    } catch (err) { next(err); }
}
