# VoicedIn Backend

Production-ready Node.js + Express backend for the voicedIn invoice platform.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.
# If PDF generation cannot launch a browser, set PUPPETEER_EXECUTABLE_PATH to Chrome or Chromium.

# 3. Create database
createdb voicedin
# Or use psql: CREATE DATABASE voicedin;

# 4. Run migrations
psql -d voicedin -f src/db/migrations/001_initial.sql

# 5. (Optional) Seed sample data
psql -d voicedin -f src/db/seed.sql

# 6. Start server
npm run dev
```

## Static Premium Payment

The app uses a static QR payment flow instead of a payment provider checkout. Configure these values in `.env`:

```env
PREMIUM_PAYMENT_AMOUNT=99
PREMIUM_PAYMENT_UPI_ID=your-upi-id@bank
PREMIUM_PAYMENT_PAYEE_NAME=Your Name
PREMIUM_PAYMENT_QR_URL=/premium-payment-qr.svg
PREMIUM_PAYMENT_NOTE=Send payment screenshot after scanning the QR. Premium is activated after confirmation.
```

Premium activation is manual: after confirming payment, update the user's subscription/user status in the database.

## Tech Stack
- **Runtime**: Node.js (ES modules)
- **Framework**: Express 4
- **Database**: PostgreSQL (pg driver)
- **Auth**: JWT + Google OAuth
- **PDF**: Puppeteer
- **Exports**: xlsx library
- **File uploads**: Multer

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Email/password signup |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/google` | Google OAuth login |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/users/me` | Get current user profile |
| GET | `/api/dashboard` | Dashboard stats + alerts + chart |
| GET/PUT | `/api/business-profile` | Business profile CRUD |
| POST | `/api/business-profile/logo` | Upload logo |
| GET/POST | `/api/clients` | List / create clients |
| GET | `/api/clients/autocomplete` | Client autocomplete |
| GET/PUT/DEL | `/api/clients/:id` | Client CRUD |
| GET | `/api/clients/:id/invoices` | Client invoices |
| GET | `/api/clients/:id/payments` | Client payments |
| GET/POST | `/api/invoices` | List / create invoices |
| GET | `/api/invoices/next-number` | Preview next number |
| GET | `/api/invoices/last/:clientId` | Last invoice for client |
| GET/PUT/DEL | `/api/invoices/:id` | Invoice CRUD |
| PATCH | `/api/invoices/:id/status` | Quick status update |
| POST | `/api/invoices/:id/duplicate` | Duplicate invoice |
| GET | `/api/invoices/:id/pdf` | Generate/download PDF |
| POST | `/api/invoices/:id/pay` | Mark as paid |
| POST | `/api/invoices/:id/unpay` | Mark as unpaid |
| GET | `/api/payments` | List all payments |
| GET | `/api/payments/alerts` | Due/overdue alerts |
| GET | `/api/invoice-templates` | List templates |
| POST | `/api/exports/csv` | Export CSV |
| POST | `/api/exports/excel` | Export Excel |
| POST | `/api/share-links` | Create share link |
| GET | `/api/share-links/:token` | Public collection view |
| GET | `/api/subscription` | Current subscription |
| GET | `/api/subscription/billing-history` | Billing history |
| POST | `/api/subscription/checkout` | Static QR payment instructions |
| POST | `/api/subscription/webhook` | Legacy no-op webhook |
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings/tax` | Update tax settings |
| PUT | `/api/settings/invoice` | Update invoice prefs |

## Demo User Credentials (Seeded)
- Email: `alex@freelance.io`
- Password: `demo123`

## Project Structure
```
src/
├── config/          # Environment config
├── controllers/     # Request handlers (11 files)
├── db/              # Pool, migrations, seed
├── middleware/       # Auth, premium guard, errors
├── routes/          # Express routers (12 files)
├── services/        # Business logic (9 files)
├── templates/       # HTML invoice templates (5)
├── utils/           # JWT, validators, transformers
├── app.js           # Express app setup
└── server.js        # Entry point
```
