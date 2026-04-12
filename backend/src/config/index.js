import dotenv from 'dotenv';
dotenv.config();

const defaultFrontendUrl = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://voicedin2.onrender.com',
  'https://voicedin.lat',
  'https://www.voicedin.lat',
].join(',');
const nodeEnv = process.env.NODE_ENV || 'development';
const frontendUrl = process.env.FRONTEND_URL || defaultFrontendUrl;
const frontendUrls = Array.from(new Set(
  `${frontendUrl},${defaultFrontendUrl}`
    .split(',')
    .map(url => url.trim())
    .filter(Boolean)
));

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || (nodeEnv === 'production' ? '' : 'postgresql://postgres:postgres@localhost:5432/voicedin'),
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  premiumPayment: {
    amount: Number(process.env.PREMIUM_PAYMENT_AMOUNT || 49),
    upiId: process.env.PREMIUM_PAYMENT_UPI_ID || '',
    payeeName: process.env.PREMIUM_PAYMENT_PAYEE_NAME || 'VoicedIn',
    qrUrl: process.env.PREMIUM_PAYMENT_QR_URL || '/my-payment-qr.jpeg',
    note: process.env.PREMIUM_PAYMENT_NOTE || 'Send payment screenshot after scanning the QR. Premium is activated after confirmation.',
  },
  godmode: {
    adminKey: process.env.GODMODE_ADMIN_KEY || 'dev-godmode-key',
  },
  frontendUrl,
  frontendUrls,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
};

export default config;
