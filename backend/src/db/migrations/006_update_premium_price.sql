ALTER TABLE premium_payment_requests
  ALTER COLUMN amount SET DEFAULT 49;

UPDATE premium_payment_requests
SET amount = 49
WHERE amount = 99 AND status = 'pending';

UPDATE subscriptions
SET price = 49
WHERE plan = 'premium' AND price = 99;
