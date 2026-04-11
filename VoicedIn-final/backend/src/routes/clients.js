import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/clientController.js';

const router = Router();

router.get('/', authenticate, ctrl.listClients);
router.get('/autocomplete', authenticate, ctrl.autocomplete);
router.get('/:id', authenticate, ctrl.getClient);
router.post('/', authenticate, ctrl.createClient);
router.put('/:id', authenticate, ctrl.updateClient);
router.delete('/:id', authenticate, ctrl.deleteClient);
router.get('/:id/invoices', authenticate, ctrl.getClientInvoices);
router.get('/:id/payments', authenticate, ctrl.getClientPayments);

export default router;
