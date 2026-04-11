import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
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
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
