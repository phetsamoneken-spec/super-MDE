-- Sales may add/delete outlets in their own assigned MDE group only.
BEGIN;
CREATE FUNCTION public.can_manage_own_store(outlet_mde UUID, outlet_assignee UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='sales'
  AND p.mde_id IS NOT NULL AND p.mde_id=outlet_mde
  AND (outlet_assignee IS NULL OR outlet_assignee=auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.can_manage_own_store(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_own_store(UUID,UUID) TO authenticated;
DROP POLICY stores_insert_admin_only ON public.stores;
DROP POLICY stores_delete_admin_only ON public.stores;
CREATE POLICY stores_insert_own_or_admin ON public.stores FOR INSERT TO authenticated
 WITH CHECK(public.is_admin() OR public.can_manage_own_store(mde_id,assigned_sales_user));
CREATE POLICY stores_delete_own_or_admin ON public.stores FOR DELETE TO authenticated
 USING(public.is_admin() OR public.can_manage_own_store(mde_id,assigned_sales_user));
COMMIT;
