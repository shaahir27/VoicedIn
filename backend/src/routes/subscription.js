import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/subscriptionController.js';

const router = Router();

router.get('/', authenticate, ctrl.getSubscription);
router.get('/billing-history', authenticate, ctrl.getBillingHistory);
router.post('/checkout', authenticate, ctrl.createCheckout);
router.post('/payment-request', authenticate, ctrl.createPaymentRequest);
router.post('/webhook', ctrl.handleWebhook); // Legacy no-op after provider checkout removal.

export default router;
