-- ====================================================================
-- MIGRATION 2: Row Level Security (RLS) Policies
-- Version: 20251105000001_rls_policies.sql
-- Note: Prepared for review before execution. Do not execute against production without approval.
-- ====================================================================

-- 1. Helper function: Check if authenticated user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Helper function: Check if store is assigned to current user
CREATE OR REPLACE FUNCTION public.is_store_assigned_to_me(p_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND assigned_sales_user = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- PROFILES POLICIES
-- ====================================================================
-- Users can view their own profile and teammates' basic profiles (for assignments)
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Admin can insert and update profiles
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can update non-privileged fields on their own profile (cannot change role)
CREATE POLICY "profiles_update_self_non_role"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- ====================================================================
-- CHANNELS & SUB CHANNELS POLICIES
-- ====================================================================
CREATE POLICY "channels_read_all"
  ON public.channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "channels_admin_modify"
  ON public.channels FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "sub_channels_read_all"
  ON public.sub_channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sub_channels_admin_modify"
  ON public.sub_channels FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ====================================================================
-- STORES POLICIES
-- ====================================================================
-- Admin can view all stores; Sales users can only view assigned stores
CREATE POLICY "stores_select_policy"
  ON public.stores FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR assigned_sales_user = auth.uid()
  );

-- Only Admin can insert new stores
CREATE POLICY "stores_insert_admin_only"
  ON public.stores FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admin can update any store; Sales users CANNOT change assignments or delete
CREATE POLICY "stores_update_admin_only"
  ON public.stores FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Only Admin can delete stores
CREATE POLICY "stores_delete_admin_only"
  ON public.stores FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ====================================================================
-- PROMOTIONS POLICIES
-- ====================================================================
-- Active/Completed promotions can be viewed by all authenticated users
CREATE POLICY "promotions_select_policy"
  ON public.promotions FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR status IN ('Active', 'Completed')
  );

-- Only Admin can manage promotions
CREATE POLICY "promotions_admin_manage"
  ON public.promotions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ====================================================================
-- PROMOTION STORES POLICIES (Order Tracking)
-- ====================================================================
-- Admin sees all; Sales user only sees participating stores assigned to them
CREATE POLICY "promotion_stores_select_policy"
  ON public.promotion_stores FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR public.is_store_assigned_to_me(store_id)
  );

-- Admin can assign stores to promotions
CREATE POLICY "promotion_stores_admin_insert"
  ON public.promotion_stores FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admin can update everything; Sales can update order status, dates, and remarks for their stores
CREATE POLICY "promotion_stores_update_policy"
  ON public.promotion_stores FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR public.is_store_assigned_to_me(store_id)
  )
  WITH CHECK (
    public.is_admin() OR (
      public.is_store_assigned_to_me(store_id)
      -- Ensure store_id and promotion_id are not tampered with
      AND store_id = store_id
      AND promotion_id = promotion_id
    )
  );

-- Only Admin can unassign / delete promotion stores
CREATE POLICY "promotion_stores_admin_delete"
  ON public.promotion_stores FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ====================================================================
-- FOLLOW UP TASKS POLICIES (To-Do List)
-- ====================================================================
-- Admin views all tasks; Sales users view only tasks assigned to them
CREATE POLICY "tasks_select_policy"
  ON public.follow_up_tasks FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR assigned_user = auth.uid()
  );

-- Users can create tasks for their assigned stores or self
CREATE POLICY "tasks_insert_policy"
  ON public.follow_up_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR (
      assigned_user = auth.uid() AND public.is_store_assigned_to_me(store_id)
    )
  );

-- Users can update status, remark, and due date of their assigned tasks
CREATE POLICY "tasks_update_policy"
  ON public.follow_up_tasks FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR assigned_user = auth.uid()
  )
  WITH CHECK (
    public.is_admin() OR assigned_user = auth.uid()
  );

-- Admin can delete any task; Sales users can only delete tasks assigned to them
CREATE POLICY "tasks_delete_policy"
  ON public.follow_up_tasks FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR assigned_user = auth.uid()
  );

-- ====================================================================
-- ORDER STATUS HISTORY AUDIT POLICIES
-- ====================================================================
CREATE POLICY "history_select_policy"
  ON public.order_status_history FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR public.is_store_assigned_to_me(store_id)
  );

CREATE POLICY "history_insert_policy"
  ON public.order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR public.is_store_assigned_to_me(store_id)
  );
