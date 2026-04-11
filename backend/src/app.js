import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import pool from './db/pool.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import businessProfileRoutes from './routes/businessProfile.js';
import clientRoutes from './routes/clients.js';
import invoiceRoutes from './routes/invoices.js';
import paymentRoutes from './routes/payments.js';
import templateRoutes from './routes/templates.js';
import dashboardRoutes from './routes/dashboard.js';
import exportRoutes from './routes/exports.js';
import shareLinkRoutes from './routes/shareLinks.js';
import subscriptionRoutes from './routes/subscription.js';
import settingsRoutes from './routes/settings.js';
import godmodeRoutes from './routes/godmode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

function apiStatus(req, res) {
    res.type('application/json').json({
        success: true,
        service: 'VoicedIn API',
        message: 'VoicedIn API is running',
        health: '/api/health',
        frontend: config.frontendUrls[0] || null,
    });
}

async function healthCheck(req, res) {
    try {
        const { rows } = await pool.query(`
            SELECT
              to_regclass('public.users') AS users_table,
              to_regclass('public.business_profiles') AS business_profiles_table
        `);
        const schemaReady = Boolean(rows[0]?.users_table && rows[0]?.business_profiles_table);

        if (!schemaReady) {
            return res.status(503).json({
                status: 'error',
                database: 'schema_missing',
                message: 'Database is reachable, but required tables are missing. Run migrations.',
                timestamp: new Date().toISOString(),
            });
        }

        res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('Health check failed:', err.message);
        res.status(503).json({
            status: 'error',
            database: 'unreachable',
            message: 'Database is not reachable. Check DATABASE_URL.',
            timestamp: new Date().toISOString(),
        });
    }
}

// ── Middleware ──
app.use(cors({
    origin(origin, callback) {
        if (!origin || config.frontendUrls.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Godmode-Key'],
    exposedHeaders: ['Content-Type', 'Content-Length', 'Content-Disposition'],
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Backend home/status routes. Keep these before API routers and the 404 handler.
app.get('/', apiStatus);
app.get('/api', apiStatus);
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', config.uploadDir)));

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/business-profile', businessProfileRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoice-templates', templateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/share-links', shareLinkRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/godmode', godmodeRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

export default app;
