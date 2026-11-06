-- ====================================================================
-- MIGRATION 1: Initial Schema for Promotion Tracking & To-Do List PWA
-- Version: 20251105000000_initial_schema.sql
-- Note: Prepared for review before execution. Do not execute against production without approval.
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. User Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'sales')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Channels Table
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Sub Channels Table
CREATE TABLE IF NOT EXISTS public.sub_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, name)
);

-- 5. Stores Table
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  channel TEXT NOT NULL,
  sub_channel TEXT NOT NULL,
  assigned_sales_user UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Vientiane',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Store queries
CREATE INDEX IF NOT EXISTS idx_stores_store_code ON public.stores(store_code);
CREATE INDEX IF NOT EXISTS idx_stores_assigned_sales ON public.stores(assigned_sales_user);
CREATE INDEX IF NOT EXISTS idx_stores_channel ON public.stores(channel);

-- 6. Promotions Table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  image_url TEXT,
  image_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('Draft', 'Active', 'Completed', 'Cancelled')) DEFAULT 'Draft',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_promotion_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_promotions_status ON public.promotions(status);

-- 7. Promotion Stores (Tracking relationship between Stores and Promotions)
CREATE TABLE IF NOT EXISTS public.promotion_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  order_status TEXT NOT NULL CHECK (order_status IN ('Not Ordered', 'Follow-up Required', 'Ordered', 'Cancelled')) DEFAULT 'Not Ordered',
  order_date TIMESTAMPTZ,
  order_amount NUMERIC(12, 2) DEFAULT 0.00,
  last_follow_up_date TIMESTAMPTZ,
  next_follow_up_date TIMESTAMPTZ,
  remark TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, promotion_id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_stores_lookup ON public.promotion_stores(promotion_id, store_id);
CREATE INDEX IF NOT EXISTS idx_promotion_stores_status ON public.promotion_stores(order_status);

-- 8. Follow-up Tasks (To-Do List Module)
CREATE TABLE IF NOT EXISTS public.follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  assigned_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
  task_status TEXT NOT NULL CHECK (task_status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')) DEFAULT 'Pending',
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user ON public.follow_up_tasks(assigned_user);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.follow_up_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.follow_up_tasks(task_status);

-- 9. Order Status History (Audit Trail)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_store_id UUID NOT NULL REFERENCES public.promotion_stores(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_promo_store ON public.order_status_history(promotion_store_id);

-- 10. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_promotion_stores_updated_at BEFORE UPDATE ON public.promotion_stores FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_follow_up_tasks_updated_at BEFORE UPDATE ON public.follow_up_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
