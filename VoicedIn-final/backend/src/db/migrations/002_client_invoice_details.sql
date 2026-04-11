-- Add normalized client detail columns while preserving legacy fields.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20);

UPDATE clients
SET company_name = COALESCE(company_name, company),
    gst_number = COALESCE(gst_number, gst)
WHERE company_name IS NULL
   OR gst_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_gst_number ON clients(gst_number);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS client_company_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_gst_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS client_address TEXT;

UPDATE invoices
SET client_company_name = COALESCE(client_company_name, company),
    client_gst_number = COALESCE(client_gst_number, ''),
    client_address = COALESCE(client_address, '')
WHERE client_company_name IS NULL
   OR client_gst_number IS NULL
   OR client_address IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = current_schema()
      AND table_name = 'invoices'
      AND constraint_name = 'invoices_client_id_fkey'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END
$$;
