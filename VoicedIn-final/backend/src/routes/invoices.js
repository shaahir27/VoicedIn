import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { demoAware } from '../middleware/premiumGuard.js';
import * as ctrl from '../controllers/invoiceController.js';
import * as payCtrl from '../controllers/paymentController.js';

const router = Router();

router.get('/', authenticate, ctrl.listInvoices);
router.get('/next-number', authenticate, ctrl.getNextNumber);
router.get('/last/:clientId', authenticate, ctrl.getLastForClient);
router.get('/:id', authenticate, ctrl.getInvoice);
router.post('/', authenticate, demoAware, ctrl.createInvoice);
router.put('/:id', authenticate, ctrl.updateInvoice);
router.delete('/:id', authenticate, ctrl.deleteInvoice);
router.patch('/:id/status', authenticate, ctrl.updateStatus);
router.post('/:id/duplicate', authenticate, ctrl.duplicateInvoice);
router.get('/:id/pdf', authenticate, demoAware, ctrl.generateInvoicePDF);

// Payment actions on invoices
router.post('/:id/pay', authenticate, payCtrl.markAsPaid);
router.post('/:id/unpay', authenticate, payCtrl.markAsUnpaid);

export default router;
