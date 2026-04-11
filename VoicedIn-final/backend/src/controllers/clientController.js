import * as clientService from '../services/clientService.js';
import * as paymentService from '../services/paymentService.js';
import pool from '../db/pool.js';
import { transformInvoice } from '../utils/transformers.js';

export async function listClients(req, res, next) {
    try {
        const clients = await clientService.listClients(req.user.id, { search: req.query.search });
        res.json({ success: true, clients });
    } catch (err) { next(err); }
}

export async function getClient(req, res, next) {
    try {
        const client = await clientService.getClient(req.user.id, req.params.id);
        res.json({ success: true, client });
    } catch (err) { next(err); }
}

export async function createClient(req, res, next) {
    try {
        const client = await clientService.createClient(req.user.id, req.body);
        res.status(201).json({ success: true, client });
    } catch (err) { next(err); }
}

export async function updateClient(req, res, next) {
    try {
        const client = await clientService.updateClient(req.user.id, req.params.id, req.body);
        res.json({ success: true, client });
    } catch (err) { next(err); }
}

export async function deleteClient(req, res, next) {
    try {
        await clientService.deleteClient(req.user.id, req.params.id);
        res.json({ success: true, message: 'Client deleted' });
    } catch (err) { next(err); }
}

export async function autocomplete(req, res, next) {
    try {
        const results = await clientService.autocompleteClients(req.user.id, req.query.q || '');
        res.json({ success: true, clients: results });
    } catch (err) { next(err); }
}

export async function getClientInvoices(req, res, next) {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM invoices WHERE user_id = $1 AND client_id = $2 ORDER BY date DESC',
            [req.user.id, req.params.id]
        );
        res.json({ success: true, invoices: rows.map(transformInvoice) });
    } catch (err) { next(err); }
}

export async function getClientPayments(req, res, next) {
    try {
        const payments = await paymentService.getClientPayments(req.user.id, req.params.id);
        res.json({ success: true, payments });
    } catch (err) { next(err); }
}
