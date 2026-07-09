-- Production hardening: canonical storage keys, safer reset tokens, stricter constraints, and audit events.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS logo_storage_key TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pdf_storage_key TEXT;

ALTER TABLE password_resets
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

ALTER TABLE password_resets
  ALTER COLUMN token DROP NOT NULL;

UPDATE password_resets
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token IS NOT NULL
  AND (token_hash IS NULL OR token_hash = '');

UPDATE clients
SET company_name = NULLIF(COALESCE(company_name, company, ''), ''),
    gst_number = NULLIF(COALESCE(gst_number, gst, ''), '')
WHERE company_name IS DISTINCT FROM NULLIF(COALESCE(company_name, company, ''), '')
   OR gst_number IS DISTINCT FROM NULLIF(COALESCE(gst_number, gst, ''), '');

UPDATE invoices
SET client_company_name = NULLIF(COALESCE(client_company_name, company, ''), '')
WHERE client_company_name IS DISTINCT FROM NULLIF(COALESCE(client_company_name, company, ''), '');

WITH duplicate_invoices AS (
  SELECT id,
         number,
         ROW_NUMBER() OVER (PARTITION BY user_id, number ORDER BY created_at, id) AS rn
  FROM invoices
)
UPDATE invoices i
SET number = CONCAT(LEFT(d.number, 20), '-DUP-', d.rn)
FROM duplicate_invoices d
WHERE i.id = d.id
  AND d.rn > 1;

WITH ranked_active AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC, id DESC) AS rn
  FROM subscriptions
  WHERE status = 'active'
)
UPDATE subscriptions s
SET status = 'expired',
    expiry_date = COALESCE(expiry_date, NOW()),
    updated_at = NOW()
FROM ranked_active r
WHERE s.id = r.id
  AND r.rn > 1;

WITH ranked_pending AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY requested_at DESC, id DESC) AS rn
  FROM premium_payment_requests
  WHERE status = 'pending'
)
UPDATE premium_payment_requests p
SET status = 'rejected',
    approved_at = COALESCE(approved_at, NOW()),
    approved_by = COALESCE(approved_by, 'migration-007')
FROM ranked_pending r
WHERE p.id = r.id
  AND r.rn > 1;

ALTER TABLE share_links
  ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '30 days';

UPDATE share_links
SET expires_at = COALESCE(expires_at, created_at + INTERVAL '30 days', NOW() + INTERVAL '30 days')
WHERE expires_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_log_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_id VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_auth_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL,
  provider_subject TEXT,
  provider_email VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_subject)
);

INSERT INTO user_auth_identities (user_id, provider, provider_subject, provider_email, metadata)
SELECT id,
       auth_provider,
       CASE WHEN auth_provider = 'email' THEN email ELSE NULL END,
       email,
       jsonb_build_object('source', 'migration-007')
FROM users
WHERE auth_provider IN ('email', 'google')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_audit_log_events_type_created_at
  ON audit_log_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_events_actor_user_id
  ON audit_log_events(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_events_target_user_id
  ON audit_log_events(target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_auth_identities_user_id
  ON user_auth_identities(user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_auth_identities_updated_at') THEN
    CREATE TRIGGER trg_user_auth_identities_updated_at
      BEFORE UPDATE ON user_auth_identities
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_invoices_user_date_desc
  ON invoices(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_user_status_date_desc
  ON invoices(user_id, status, date DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_user_client_date_desc
  ON invoices(user_id, client_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_clients_user_name
  ON clients(user_id, name);

CREATE INDEX IF NOT EXISTS idx_clients_user_company_name
  ON clients(user_id, company_name);

CREATE INDEX IF NOT EXISTS idx_payment_records_user_date_desc
  ON payment_records(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_billing_payments_user_date_desc
  ON billing_payments(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash
  ON password_resets(token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_user_number
  ON invoices(user_id, number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_premium_payment_requests_pending_user
  ON premium_payment_requests(user_id)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_active_user
  ON subscriptions(user_id)
  WHERE status = 'active';

ALTER TABLE invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_qty_non_negative,
  DROP CONSTRAINT IF EXISTS invoice_items_rate_non_negative,
  DROP CONSTRAINT IF EXISTS invoice_items_tax_non_negative,
  DROP CONSTRAINT IF EXISTS invoice_items_line_total_non_negative;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_subtotal_non_negative,
  DROP CONSTRAINT IF EXISTS invoices_tax_total_non_negative,
  DROP CONSTRAINT IF EXISTS invoices_total_non_negative;

ALTER TABLE payment_records
  DROP CONSTRAINT IF EXISTS payment_records_amount_non_negative;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_price_non_negative;

ALTER TABLE billing_payments
  DROP CONSTRAINT IF EXISTS billing_payments_amount_non_negative;

ALTER TABLE premium_payment_requests
  DROP CONSTRAINT IF EXISTS premium_payment_requests_amount_non_negative;

ALTER TABLE invoice_items
  ADD CONSTRAINT invoice_items_qty_non_negative CHECK (qty > 0),
  ADD CONSTRAINT invoice_items_rate_non_negative CHECK (rate >= 0),
  ADD CONSTRAINT invoice_items_tax_non_negative CHECK (tax >= 0),
  ADD CONSTRAINT invoice_items_line_total_non_negative CHECK (line_total >= 0);

ALTER TABLE invoices
  ADD CONSTRAINT invoices_subtotal_non_negative CHECK (subtotal >= 0),
  ADD CONSTRAINT invoices_tax_total_non_negative CHECK (tax_total >= 0),
  ADD CONSTRAINT invoices_total_non_negative CHECK (total >= 0);

ALTER TABLE payment_records
  ADD CONSTRAINT payment_records_amount_non_negative CHECK (amount >= 0);

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_price_non_negative CHECK (price >= 0);

ALTER TABLE billing_payments
  ADD CONSTRAINT billing_payments_amount_non_negative CHECK (amount >= 0);

ALTER TABLE premium_payment_requests
  ADD CONSTRAINT premium_payment_requests_amount_non_negative CHECK (amount >= 0);
