import { Router } from 'express';
import { godmodeAuth } from '../middleware/godmodeAuth.js';
import * as ctrl from '../controllers/godmodeController.js';

const router = Router();

router.get('/payment-requests', godmodeAuth, ctrl.listPaymentRequests);
router.post('/payment-requests/:id/approve', godmodeAuth, ctrl.approvePaymentRequest);
router.post('/payment-requests/:id/reject', godmodeAuth, ctrl.rejectPaymentRequest);

export default router;
