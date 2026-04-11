import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/dashboardController.js';

const router = Router();

router.get('/', authenticate, ctrl.getDashboard);

export default router;
