-- Backend-only access model: keep direct browser clients blocked by RLS.
-- The Express backend connects with a trusted database role and remains the data access boundary.

ALTER TABLE premium_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.token_blocklist') IS NOT NULL THEN
    ALTER TABLE token_blocklist ENABLE ROW LEVEL SECURITY;
  END IF;
END;
$$;
