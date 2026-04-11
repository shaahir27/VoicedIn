import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/templateController.js';

const router = Router();

// Templates are public (demo users can preview)
router.get('/', optionalAuth, ctrl.listTemplates);
router.get('/:id', optionalAuth, ctrl.getTemplate);

export default router;
