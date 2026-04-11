import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/businessProfileController.js';

const router = Router();

router.get('/', authenticate, ctrl.getSettings);
router.put('/tax', authenticate, ctrl.updateTaxSettings);
router.put('/invoice', authenticate, ctrl.updateInvoiceSettings);

export default router;
