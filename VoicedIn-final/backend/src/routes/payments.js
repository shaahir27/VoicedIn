import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/paymentController.js';

const router = Router();

router.get('/', authenticate, ctrl.listPayments);
router.get('/alerts', authenticate, ctrl.getAlerts);

export default router;
