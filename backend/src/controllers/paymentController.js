import * as paymentService from '../services/paymentService.js';

export async function markAsPaid(req, res, next) {
    try {
        const payment = await paymentService.markAsPaid(req.user.id, req.params.id, req.body);
        res.status(201).json({ success: true, payment });
    } catch (err) { next(err); }
}

export async function markAsUnpaid(req, res, next) {
    try {
        await paymentService.markAsUnpaid(req.user.id, req.params.id);
        res.json({ success: true, message: 'Invoice marked as unpaid' });
    } catch (err) { next(err); }
}

export async function listPayments(req, res, next) {
    try {
        const payments = await paymentService.listPayments(req.user.id, req.query);
        res.json({ success: true, payments });
    } catch (err) { next(err); }
}

export async function getAlerts(req, res, next) {
    try {
        const alerts = await paymentService.getAlerts(req.user.id);
        res.json({ success: true, ...alerts });
    } catch (err) { next(err); }
}
