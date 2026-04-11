-- Business profile bank details and invoice-specific share links.

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(64) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(32) DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_upi VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS include_bank_details BOOLEAN DEFAULT false;

ALTER TABLE share_links
  ADD COLUMN IF NOT EXISTS invoice_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = current_schema()
      AND table_name = 'share_links'
      AND constraint_name = 'share_links_invoice_id_fkey'
  ) THEN
    ALTER TABLE share_links
      ADD CONSTRAINT share_links_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_share_links_invoice_id ON share_links(invoice_id);
