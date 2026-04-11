import * as shareLinkService from '../services/shareLinkService.js';

export async function createShareLink(req, res, next) {
    try {
        const link = await shareLinkService.createShareLink(req.user.id, req.body);
        res.status(201).json({ success: true, ...link });
    } catch (err) { next(err); }
}

export async function getShareLinkData(req, res, next) {
    try {
        const data = await shareLinkService.getShareLinkData(req.params.token);
        res.json({ success: true, ...data });
    } catch (err) { next(err); }
}

export async function revokeShareLink(req, res, next) {
    try {
        await shareLinkService.revokeShareLink(req.user.id, req.params.id);
        res.json({ success: true, message: 'Share link revoked' });
    } catch (err) { next(err); }
}

export async function listShareLinks(req, res, next) {
    try {
        const links = await shareLinkService.listShareLinks(req.user.id);
        res.json({ success: true, links });
    } catch (err) { next(err); }
}
