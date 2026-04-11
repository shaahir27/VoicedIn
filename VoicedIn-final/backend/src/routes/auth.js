import { Router } from 'express';
import * as ctrl from '../controllers/authController.js';

const router = Router();

router.post('/signup', ctrl.signup);
router.post('/login', ctrl.login);
router.post('/google', ctrl.googleAuth);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

export default router;
