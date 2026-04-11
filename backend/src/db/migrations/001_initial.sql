-- VoicedIn Database Schema
-- Run this migration: psql -d voicedin -f 001_initial.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ───
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google')),
  avatar_url TEXT,
  subscription_status VARCHAR(30) DEFAULT 'demo' CHECK (subscription_status IN ('guest_demo', 'registered_demo', 'demo', 'premium_active', 'active', 'premium_expired', 'cancelled')),
  demo_used BOOLEAN DEFAULT false,
  demo_started_at TIMESTAMPTZ,
  demo_completed_at TIMESTAMPTZ,
  onboarding_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Business Profiles ───
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) DEFAULT '',
  logo_url TEXT,
  gst_number VARCHAR(20),
  pan_number VARCHAR(15),
  business_address TEXT DEFAULT '',
  contact_email VARCHAR(255) DEFAULT '',
  contact_phone VARCHAR(30) DEFAULT '',
  website VARCHAR(255) DEFAULT '',
  currency VARCHAR(5) DEFAULT 'INR',
  invoice_prefix VARCHAR(10) DEFAULT 'INV',
  invoice_numbering_format VARCHAR(50) DEFAULT '{PREFIX}-{YYMM}-{SEQ}',
  default_notes TEXT DEFAULT '',
  default_terms TEXT DEFAULT 'Payment is due within 15 days of issue.',
  default_template VARCHAR(20) DEFAULT 'modern',
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  bank_account_name VARCHAR(255) DEFAULT '',
  bank_name VARCHAR(255) DEFAULT '',
  bank_account_number VARCHAR(64) DEFAULT '',
  bank_ifsc VARCHAR(32) DEFAULT '',
  bank_upi VARCHAR(255) DEFAULT '',
  include_bank_details BOOLEAN DEFAULT false,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Clients ───
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  company_name VARCHAR(255),
  gst_number VARCHAR(20),
  company VARCHAR(255),
  gst VARCHAR(20),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoices ───
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  number VARCHAR(30) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  company VARCHAR(255) DEFAULT '',
  client_company_name VARCHAR(255),
  client_gst_number VARCHAR(20),
  client_address TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'unpaid', 'paid', 'overdue')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_total DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  terms TEXT DEFAULT '',
  template VARCHAR(20) DEFAULT 'modern',
  currency VARCHAR(5) DEFAULT 'INR',
  is_draft BOOLEAN DEFAULT true,
  pdf_url TEXT,
  share_token VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoice Items ───
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  qty DECIMAL(10,2) NOT NULL DEFAULT 1,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2) DEFAULT 0,
  sort_order INT DEFAULT 0
);

-- ─── Payment Records ───
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_number VARCHAR(30),
  client_name VARCHAR(255),
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  method VARCHAR(30) DEFAULT 'Bank Transfer',
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Subscriptions ───
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) DEFAULT 'demo' CHECK (plan IN ('demo', 'premium')),
  price DECIMAL(8,2) DEFAULT 0,
  status VARCHAR(25) DEFAULT 'demo' CHECK (status IN ('demo', 'active', 'expired', 'cancelled', 'payment_failed')),
  start_date TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  provider_customer_id VARCHAR(100),
  provider_subscription_id VARCHAR(100),
  provider_payment_id VARCHAR(100),
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Billing Payments ───
CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(8,2) NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  method VARCHAR(30) DEFAULT 'UPI',
  status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Share Links ───
CREATE TABLE IF NOT EXISTS premium_payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(8,2) NOT NULL DEFAULT 99,
  currency VARCHAR(5) DEFAULT 'INR',
  upi_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  date_from DATE,
  date_to DATE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ─── Password Resets ───
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoice Sequence Tracker ───
CREATE TABLE IF NOT EXISTS invoice_sequences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_seq INT DEFAULT 0
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_gst_number ON clients(gst_number);
CREATE INDEX IF NOT EXISTS idx_payment_records_invoice_id ON payment_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_payment_requests_status ON premium_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_premium_payment_requests_user_id ON premium_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_invoice_id ON share_links(invoice_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);

-- ─── Updated_at trigger function ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_business_profiles_updated_at BEFORE UPDATE ON business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
