import * as authService from '../services/authService.js';

export async function signup(req, res, next) {
    try {
        const result = await authService.signup(req.body);
        res.status(201).json({ success: true, ...result });
    } catch (err) { next(err); }
}

export async function login(req, res, next) {
    try {
        const result = await authService.login(req.body);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
}

export async function googleAuth(req, res, next) {
    try {
        const result = await authService.googleAuth(req.body);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
}

export async function forgotPassword(req, res, next) {
    try {
        const result = await authService.forgotPassword(req.body);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
}

export async function resetPassword(req, res, next) {
    try {
        const result = await authService.resetPassword(req.body);
        res.json({ success: true, ...result });
    } catch (err) { next(err); }
}
