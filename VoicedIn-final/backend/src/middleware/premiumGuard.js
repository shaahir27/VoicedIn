import { ForbiddenError } from '../utils/errors.js';

export function premiumGuard(req, res, next) {
    const status = req.user?.subscription_status;
    if (status === 'premium_active' || status === 'active') {
        return next();
    }
    next(new ForbiddenError('This feature requires a Premium subscription. Please upgrade to continue.'));
}

// Allows demo users but tracks demo usage
export function demoAware(req, res, next) {
    const status = req.user?.subscription_status;
    req.isDemo = !status || status === 'demo' || status === 'guest_demo' || status === 'registered_demo';
    req.isPremium = status === 'premium_active' || status === 'active';
    next();
}
