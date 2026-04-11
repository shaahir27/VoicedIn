-- VoicedIn Seed Data
-- Matches the frontend's sample data exactly

-- ─── Demo User ───
INSERT INTO users (id, name, email, password_hash, auth_provider, subscription_status, demo_used)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Alex Kumar',
  'alex@freelance.io',
  '$2a$10$KIXkqFv8Y3TGx1Hby0hXe.HZDZ7pVm8fLUTfb0vAfRlfGJE0rE2n6', -- password: demo123
  'email',
  'active',
  false
) ON CONFLICT (email) DO NOTHING;

-- ─── Business Profile ───
INSERT INTO business_profiles (user_id, business_name, gst_number, pan_number, business_address, contact_email, contact_phone, website, currency, invoice_prefix, default_terms, tax_rate)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Alex Kumar Design',
  '27AADCA1234F1Z5',
  'ABCDE1234F',
  '123, MG Road, Mumbai',
  'alex@freelance.io',
  '+91 98765 43210',
  'alexkumar.design',
  'INR',
  'INV',
  'Payment is due within 15 days of issue. A late fee of 2% per month may apply to overdue amounts.',
  18.00
) ON CONFLICT (user_id) DO NOTHING;

-- ─── Subscription ───
INSERT INTO subscriptions (user_id, plan, price, status, start_date, renewal_date)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'premium', 100, 'active',
  '2026-02-01', '2026-05-01'
) ON CONFLICT DO NOTHING;

-- ─── Invoice Sequence ───
INSERT INTO invoice_sequences (user_id, current_seq)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10)
ON CONFLICT (user_id) DO NOTHING;

-- ─── Clients ───
INSERT INTO clients (id, user_id, name, email, phone, company, gst, address, created_at) VALUES
  ('c1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Priya Sharma', 'priya@designstudio.in', '+91 98765 43210', 'Sharma Design Studio', '27AADCS1234F1Z5', '412, Bandra West, Mumbai, Maharashtra 400050', '2025-08-15'),
  ('c1000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Rahul Mehta', 'rahul@techsolutions.com', '+91 87654 32109', 'TechSolutions Pvt Ltd', '29AABCT5678H1Z3', '56, Koramangala, Bengaluru, Karnataka 560034', '2025-06-20'),
  ('c1000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Ananya Reddy', 'ananya@contentcraft.io', '+91 76543 21098', 'ContentCraft Media', '36AABCC9012K1Z1', '78, Jubilee Hills, Hyderabad, Telangana 500033', '2025-10-01'),
  ('c1000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Vikram Singh', 'vikram@buildspace.co', '+91 65432 10987', 'BuildSpace Architecture', '07AABCB3456L1Z8', '23, Connaught Place, New Delhi 110001', '2025-04-10'),
  ('c1000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Meera Patel', 'meera@greenleaf.org', '+91 54321 09876', 'GreenLeaf Organics', '24AABCG7890M1Z6', '15, CG Road, Ahmedabad, Gujarat 380006', '2025-12-05'),
  ('c1000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Arjun Nair', 'arjun@pixelwave.dev', '+91 43210 98765', 'PixelWave Studios', '32AABCP4567N1Z4', '89, Marine Drive, Kochi, Kerala 682031', '2025-09-12')
ON CONFLICT DO NOTHING;

-- ─── Invoices ───
INSERT INTO invoices (id, user_id, client_id, number, client_name, company, status, date, due_date, paid_date, subtotal, tax_total, total, notes, template, is_draft) VALUES
  ('e1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000001', 'INV-2604-0001', 'Priya Sharma', 'Sharma Design Studio', 'paid', '2026-03-01', '2026-03-15', '2026-03-12', 35000, 6300, 41300, 'Thank you for your business!', 'modern', false),
  ('e1000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000002', 'INV-2604-0002', 'Rahul Mehta', 'TechSolutions Pvt Ltd', 'unpaid', '2026-03-15', '2026-04-15', NULL, 95000, 17100, 112100, 'Payment due within 30 days.', 'classic', false),
  ('e1000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000003', 'INV-2604-0003', 'Ananya Reddy', 'ContentCraft Media', 'paid', '2026-02-20', '2026-03-05', '2026-03-03', 33000, 5940, 38940, 'Quality content delivered as agreed.', 'minimal', false),
  ('e1000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000004', 'INV-2604-0004', 'Vikram Singh', 'BuildSpace Architecture', 'overdue', '2026-02-01', '2026-03-01', NULL, 145000, 26100, 171100, 'Please process payment at the earliest.', 'modern', false),
  ('e1000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000005', 'INV-2604-0005', 'Meera Patel', 'GreenLeaf Organics', 'unpaid', '2026-03-25', '2026-04-25', NULL, 45000, 8100, 53100, 'Includes 2 rounds of revisions.', 'elegant', false),
  ('e1000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000006', 'INV-2604-0006', 'Arjun Nair', 'PixelWave Studios', 'paid', '2026-01-10', '2026-01-25', '2026-01-22', 75000, 13500, 88500, 'Great working with you!', 'modern', false),
  ('e1000001-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000002', 'INV-2604-0007', 'Rahul Mehta', 'TechSolutions Pvt Ltd', 'paid', '2026-01-20', '2026-02-20', '2026-02-18', 85000, 15300, 100300, 'Phase 1 completed successfully.', 'classic', false),
  ('e1000001-0000-0000-0000-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000004', 'INV-2604-0008', 'Vikram Singh', 'BuildSpace Architecture', 'overdue', '2026-01-05', '2026-02-05', NULL, 40000, 7200, 47200, 'Immediate attention required.', 'minimal', false),
  ('e1000001-0000-0000-0000-000000000009', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000001', 'INV-2604-0009', 'Priya Sharma', 'Sharma Design Studio', 'draft', '2026-04-10', '2026-04-25', NULL, 65000, 11700, 76700, 'Draft — pending review.', 'modern', true),
  ('e1000001-0000-0000-0000-000000000010', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000006', 'INV-2604-0010', 'Arjun Nair', 'PixelWave Studios', 'unpaid', '2026-04-01', '2026-05-01', NULL, 55000, 9900, 64900, 'Delivered 50 edited product shots.', 'elegant', false)
ON CONFLICT DO NOTHING;

-- ─── Invoice Items ───
INSERT INTO invoice_items (invoice_id, description, qty, rate, tax, line_total, sort_order) VALUES
  -- inv1
  ('e1000001-0000-0000-0000-000000000001', 'Brand Identity Design', 1, 25000, 18, 29500, 0),
  ('e1000001-0000-0000-0000-000000000001', 'Social Media Kit', 1, 10000, 18, 11800, 1),
  -- inv2
  ('e1000001-0000-0000-0000-000000000002', 'Full Stack Web Development', 1, 80000, 18, 94400, 0),
  ('e1000001-0000-0000-0000-000000000002', 'Cloud Hosting Setup', 1, 15000, 18, 17700, 1),
  -- inv3
  ('e1000001-0000-0000-0000-000000000003', 'Blog Content Writing (10 posts)', 10, 2500, 18, 29500, 0),
  ('e1000001-0000-0000-0000-000000000003', 'SEO Optimization', 1, 8000, 18, 9440, 1),
  -- inv4
  ('e1000001-0000-0000-0000-000000000004', '3D Architectural Rendering', 3, 35000, 18, 123900, 0),
  ('e1000001-0000-0000-0000-000000000004', 'Floor Plan Drafting', 5, 8000, 18, 47200, 1),
  -- inv5
  ('e1000001-0000-0000-0000-000000000005', 'E-commerce Website Design', 1, 45000, 18, 53100, 0),
  -- inv6
  ('e1000001-0000-0000-0000-000000000006', 'Motion Graphics Package', 1, 55000, 18, 64900, 0),
  ('e1000001-0000-0000-0000-000000000006', 'Sound Design', 1, 20000, 18, 23600, 1),
  -- inv7
  ('e1000001-0000-0000-0000-000000000007', 'API Development', 1, 60000, 18, 70800, 0),
  ('e1000001-0000-0000-0000-000000000007', 'Database Optimization', 1, 25000, 18, 29500, 1),
  -- inv8
  ('e1000001-0000-0000-0000-000000000008', 'Interior Design Consultation', 2, 20000, 18, 47200, 0),
  -- inv9
  ('e1000001-0000-0000-0000-000000000009', 'Website Redesign', 1, 50000, 18, 59000, 0),
  ('e1000001-0000-0000-0000-000000000009', 'UI/UX Audit', 1, 15000, 18, 17700, 1),
  -- inv10
  ('e1000001-0000-0000-0000-000000000010', 'Product Photography', 1, 30000, 18, 35400, 0),
  ('e1000001-0000-0000-0000-000000000010', 'Photo Editing & Retouching', 50, 500, 18, 29500, 1)
ON CONFLICT DO NOTHING;

-- ─── Payment Records ───
INSERT INTO payment_records (id, user_id, invoice_id, invoice_number, client_name, amount, date, method, status) VALUES
  ('f1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'e1000001-0000-0000-0000-000000000001', 'INV-2604-0001', 'Priya Sharma', 41300, '2026-03-12', 'UPI', 'completed'),
  ('f1000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'e1000001-0000-0000-0000-000000000003', 'INV-2604-0003', 'Ananya Reddy', 38940, '2026-03-03', 'Bank Transfer', 'completed'),
  ('f1000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'e1000001-0000-0000-0000-000000000006', 'INV-2604-0006', 'Arjun Nair', 88500, '2026-01-22', 'UPI', 'completed'),
  ('f1000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'e1000001-0000-0000-0000-000000000007', 'INV-2604-0007', 'Rahul Mehta', 100300, '2026-02-18', 'Bank Transfer', 'completed')
ON CONFLICT DO NOTHING;

-- ─── Billing Payments ───
INSERT INTO billing_payments (user_id, amount, date, method, status) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 100, '2026-04-01', 'UPI', 'paid'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 100, '2026-03-01', 'UPI', 'paid'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 100, '2026-02-01', 'UPI', 'paid')
ON CONFLICT DO NOTHING;
