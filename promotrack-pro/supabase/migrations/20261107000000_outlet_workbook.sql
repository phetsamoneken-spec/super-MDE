-- Schema for the nine columns in outlet.xlsx. This migration does not delete
-- existing rows and does not create or impersonate Supabase Auth users.
BEGIN;

CREATE TABLE public.main_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (btrim(name) <> '')
);
CREATE TABLE public.mdes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (btrim(name) <> '')
);

ALTER TABLE public.channels ADD COLUMN main_channel_id UUID REFERENCES public.main_channels(id) ON DELETE RESTRICT;
ALTER TABLE public.profiles ADD COLUMN mde_id UUID REFERENCES public.mdes(id) ON DELETE SET NULL;
ALTER TABLE public.stores
  ADD COLUMN mde_name TEXT,
  ADD COLUMN main_channel TEXT,
  ADD COLUMN village TEXT,
  ADD COLUMN district TEXT,
  ADD COLUMN province TEXT,
  ADD COLUMN mde_id UUID REFERENCES public.mdes(id) ON DELETE RESTRICT,
  ADD COLUMN main_channel_id UUID REFERENCES public.main_channels(id) ON DELETE RESTRICT,
  ADD COLUMN channel_id UUID REFERENCES public.channels(id) ON DELETE RESTRICT,
  ADD COLUMN sub_channel_id UUID REFERENCES public.sub_channels(id) ON DELETE RESTRICT,
  ALTER COLUMN city DROP DEFAULT;
CREATE INDEX idx_stores_mde ON public.stores(mde_id);
CREATE INDEX idx_stores_district ON public.stores(district);
CREATE INDEX idx_stores_sub_channel ON public.stores(sub_channel_id);

-- MDEs are source business entities, not auth accounts. Link a real authenticated
-- sales profile via profiles.mde_id after the owner provisions the account.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
-- Adding an MDE binding also requires freezing it for self-service profile edits;
-- otherwise a Sales user could point their own profile at another MDE's outlets.
CREATE FUNCTION public.can_update_own_profile(profile_id UUID, profile_role TEXT, profile_mde_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.id = profile_id
    AND p.role = profile_role AND p.mde_id IS NOT DISTINCT FROM profile_mde_id);
$$;
DROP POLICY IF EXISTS profiles_update_self_non_role ON public.profiles;
CREATE POLICY profiles_update_self_non_role ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (public.can_update_own_profile(id, role, mde_id));

CREATE OR REPLACE FUNCTION public.is_store_assigned_to_me(p_store_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = p_store_id AND (
      s.assigned_sales_user = auth.uid() OR
      s.mde_id IN (SELECT p.mde_id FROM public.profiles p WHERE p.id = auth.uid() AND p.mde_id IS NOT NULL)
    )
  );
$$;
DROP POLICY IF EXISTS stores_select_policy ON public.stores;
CREATE POLICY stores_select_policy ON public.stores FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_store_assigned_to_me(id));

ALTER TABLE public.main_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdes ENABLE ROW LEVEL SECURITY;
CREATE POLICY main_channels_read ON public.main_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY main_channels_admin ON public.main_channels FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY mdes_read ON public.mdes FOR SELECT TO authenticated USING (true);
CREATE POLICY mdes_admin ON public.mdes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Compatibility view preserves the workbook's original header spellings.
-- security_invoker ensures its rows obey the caller's store RLS policies.
CREATE VIEW public.outlet_directory WITH (security_invoker = true) AS
SELECT mde_name AS "MDE NAME", store_code AS "OUTLET CODE", store_name AS "OUTLET",
       main_channel AS "MIAN CHANEL", channel AS "CHENEL", sub_channel AS "SUB-CHANEL",
       village AS "VILLAG", district AS "DISTRICT", province AS "PROVINCE"
FROM public.stores;
GRANT SELECT ON public.main_channels, public.mdes, public.outlet_directory TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.main_channels, public.mdes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.channels, public.sub_channels,
  public.stores, public.promotions, public.promotion_stores, public.follow_up_tasks,
  public.order_status_history TO authenticated;
COMMIT;
