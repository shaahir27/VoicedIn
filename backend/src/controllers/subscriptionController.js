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
        const signature = req.headers['x-webhook-signature'] || req.headers['x-dodo-signature'] || '';
        await subscriptionService.handleWebhook(req.body, signature);
        res.json({ received: true });
    } catch (err) { next(err); }
}
