-- Keep all app-owned public tables behind the backend-only RLS boundary.

ALTER TABLE audit_log_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_auth_identities ENABLE ROW LEVEL SECURITY;
