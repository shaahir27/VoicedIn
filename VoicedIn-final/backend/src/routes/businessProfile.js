import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/businessProfileController.js';

const router = Router();

router.get('/', authenticate, ctrl.getBusinessProfile);
router.put('/', authenticate, ctrl.updateBusinessProfile);
router.post('/logo', authenticate, ctrl.logoUpload, ctrl.uploadLogo);

export default router;
