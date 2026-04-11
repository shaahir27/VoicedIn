import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { premiumGuard } from '../middleware/premiumGuard.js';
import * as ctrl from '../controllers/exportController.js';

const router = Router();

router.post('/csv', authenticate, premiumGuard, ctrl.exportCSV);
router.post('/pdf', authenticate, premiumGuard, ctrl.exportPDF);
router.post('/excel', authenticate, premiumGuard, ctrl.exportExcel);
router.get('/download/:filename', authenticate, ctrl.downloadExport);

export default router;
