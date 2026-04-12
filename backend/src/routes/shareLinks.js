import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/shareLinkController.js';

const router = Router();

// Public endpoint — no auth needed to view shared collection
router.get('/:token', ctrl.getShareLinkData);

// Authenticated endpoints
router.get('/', authenticate, ctrl.listShareLinks);
router.post('/', authenticate, ctrl.createShareLink);
router.delete('/:id', authenticate, ctrl.revokeShareLink);

export default router;
