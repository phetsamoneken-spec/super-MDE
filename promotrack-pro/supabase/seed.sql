-- ====================================================================
-- SEED SCRIPT: Initial Reference Data, Demo Users, Stores & Promotions
-- Version: seed.sql
-- ====================================================================

-- 1. Channels & Sub Channels
INSERT INTO public.channels (id, name, description) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Modern Trade', 'Supermarkets, Hypermarkets, and Department Stores'),
  ('c1000000-0000-0000-0000-000000000002', 'General Trade', 'Traditional grocery shops, Mom & Pop stores'),
  ('c1000000-0000-0000-0000-000000000003', 'Convenience Store (CVS)', '24/7 minimarts and chain convenience stores'),
  ('c1000000-0000-0000-0000-000000000004', 'Wholesale', 'Bulk distributors and large trading outlets'),
  ('c1000000-0000-0000-0000-000000000005', 'HORECA', 'Hotels, Restaurants, and Cafes')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.sub_channels (id, channel_id, name, description) VALUES
  ('sc100000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Hypermarket', 'Large format retail'),
  ('sc100000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Supermarket', 'Neighborhood food supermarket'),
  ('sc100000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'Medium Grocery', 'Village & commune grocery store'),
  ('sc100000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', 'Chain CVS', 'Branded convenience chain (e.g., M-Point, Sokxay Plus)'),
  ('sc100000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', 'Cash & Carry', 'Bulk wholesale hub')
ON CONFLICT DO NOTHING;

-- 2. Demo Profiles
INSERT INTO public.profiles (id, email, full_name, phone, role) VALUES
  ('u1000000-0000-0000-0000-000000000001', 'admin@promotrack.la', 'Sengdavanh Phommasone', '+856 20 5551 2345', 'admin'),
  ('u1000000-0000-0000-0000-000000000002', 'khamphanh@promotrack.la', 'Khamphanh Keomany', '+856 20 5552 3456', 'sales'),
  ('u1000000-0000-0000-0000-000000000003', 'soulinthone@promotrack.la', 'Soulinthone Vongsa', '+856 20 5553 4567', 'sales'),
  ('u1000000-0000-0000-0000-000000000004', 'bounmy@promotrack.la', 'Bounmy Sisoulath', '+856 20 5554 5678', 'sales')
ON CONFLICT (id) DO NOTHING;
