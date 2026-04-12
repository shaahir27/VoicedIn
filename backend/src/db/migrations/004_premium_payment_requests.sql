-- Manual premium payment approval queue for the Godmode admin route.

CREATE TABLE IF NOT EXISTS premium_payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(8,2) NOT NULL DEFAULT 49,
  currency VARCHAR(5) DEFAULT 'INR',
  upi_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_premium_payment_requests_status ON premium_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_premium_payment_requests_user_id ON premium_payment_requests(user_id);
