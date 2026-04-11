import config from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';

export function godmodeAuth(req, _res, next) {
    const providedKey = req.headers['x-godmode-key'];
    if (!providedKey || providedKey !== config.godmode.adminKey) {
        return next(new UnauthorizedError('Invalid godmode key'));
    }
    next();
}
