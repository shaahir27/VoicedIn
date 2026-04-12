-- Store bank-detail visibility per invoice so each generated PDF can choose it.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS include_bank_details BOOLEAN;

ALTER TABLE invoices
  ALTER COLUMN include_bank_details DROP DEFAULT;
