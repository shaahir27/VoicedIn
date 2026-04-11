import * as subscriptionService from '../services/subscriptionService.js';

export async function getSubscription(req, res, next) {
    try {
        const sub = await subscriptionService.getSubscription(req.user.id);
        res.json({ success: true, ...sub });
    } catch (err) { next(err); }
}

export async function getBillingHistory(req, res, next) {
    try {
        const history = await subscriptionService.getBillingHistory(req.user.id);
        res.json({ success: true, billingHistory: history });
    } catch (err) { next(err); }
}

export async function createCheckout(req, res, next) {
    try {
        const result = await subscriptionService.createCheckout(req.user.id);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
}

export async function handleWebhook(req, res, next) {
    try {
        await subscriptionService.handleWebhook();
        res.json({ received: true });
    } catch (err) { next(err); }
}

export async function createPaymentRequest(req, res, next) {
    try {
        const result = await subscriptionService.createPaymentRequest(req.user.id);
        res.status(result.request ? 201 : 200).json({ success: true, ...result });
    } catch (err) { next(err); }
}
