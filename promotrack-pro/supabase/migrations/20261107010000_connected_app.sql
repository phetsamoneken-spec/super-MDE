-- Real Auth profiles and atomic, RLS-enforced app persistence.
BEGIN;
CREATE TABLE public.app_admin_allowlist (email TEXT PRIMARY KEY CHECK (email = lower(email)));
ALTER TABLE public.app_admin_allowlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_admin_allowlist FROM anon, authenticated;

CREATE FUNCTION public.ensure_my_profile() RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE account auth.users; result public.profiles; owner BOOLEAN;
BEGIN
  SELECT * INTO account FROM auth.users WHERE id = auth.uid();
  IF account.id IS NULL OR account.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'A verified account is required'; END IF;
  owner := EXISTS (SELECT 1 FROM public.app_admin_allowlist WHERE email = lower(account.email));
  INSERT INTO public.profiles(id, email, full_name, role)
    VALUES(account.id, account.email, CASE WHEN owner THEN 'Admin' ELSE split_part(account.email, '@', 1) END, CASE WHEN owner THEN 'admin' ELSE 'sales' END)
    ON CONFLICT(id) DO NOTHING;
  IF owner THEN UPDATE public.profiles SET role = 'admin', mde_id = NULL WHERE id = account.id; END IF;
  SELECT * INTO result FROM public.profiles WHERE id = account.id;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;
DROP POLICY profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());

ALTER TABLE public.channels ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.sub_channels ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.promotions ADD COLUMN target_sub_channels TEXT[] NOT NULL DEFAULT '{}';
CREATE TRIGGER channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER sub_channels_updated_at BEFORE UPDATE ON public.sub_channels FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.new_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_name TEXT NOT NULL, sku TEXT NOT NULL,
  category TEXT NOT NULL, launch_date DATE NOT NULL, end_date DATE, pack_size TEXT NOT NULL,
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0), target_distribution_rate NUMERIC NOT NULL CHECK (target_distribution_rate BETWEEN 0 AND 100),
  target_units_per_store NUMERIC NOT NULL CHECK (target_units_per_store >= 0), description TEXT NOT NULL DEFAULT '',
  image_url TEXT, status TEXT NOT NULL CHECK (status IN ('Draft','Active','Completed','Cancelled')),
  target_sub_channels TEXT[] NOT NULL DEFAULT '{}', created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= launch_date)
);
CREATE TABLE public.new_product_store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES public.new_products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_status TEXT NOT NULL CHECK (order_status IN ('Ordered','Not Ordered','Sample Provided','Follow-up Required','Declined')),
  order_quantity NUMERIC, order_amount NUMERIC, order_date TIMESTAMPTZ, invoice_number TEXT,
  sample_given_date TIMESTAMPTZ, sample_qty NUMERIC, customer_feedback TEXT, next_follow_up_date TIMESTAMPTZ,
  updated_by UUID REFERENCES public.profiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, store_id)
);
CREATE TRIGGER new_products_updated_at BEFORE UPDATE ON public.new_products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER new_product_orders_updated_at BEFORE UPDATE ON public.new_product_store_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.new_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_product_store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY new_products_read ON public.new_products FOR SELECT TO authenticated USING (public.is_admin() OR status IN ('Active','Completed'));
CREATE POLICY new_products_admin ON public.new_products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY new_product_orders_read ON public.new_product_store_orders FOR SELECT TO authenticated USING (public.is_admin() OR public.is_store_assigned_to_me(store_id));
CREATE POLICY new_product_orders_admin ON public.new_product_store_orders FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY new_product_orders_update ON public.new_product_store_orders FOR UPDATE TO authenticated USING (public.is_store_assigned_to_me(store_id)) WITH CHECK (public.is_store_assigned_to_me(store_id));

CREATE FUNCTION public.prevent_order_reassignment() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() AND (
    NEW.store_id IS DISTINCT FROM OLD.store_id OR
    (to_jsonb(NEW)->>'promotion_id') IS DISTINCT FROM (to_jsonb(OLD)->>'promotion_id') OR
    (to_jsonb(NEW)->>'product_id') IS DISTINCT FROM (to_jsonb(OLD)->>'product_id')
  ) THEN RAISE EXCEPTION 'Only Admin may reassign an order'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER promotion_order_identity BEFORE UPDATE ON public.promotion_stores FOR EACH ROW EXECUTE FUNCTION public.prevent_order_reassignment();
CREATE TRIGGER new_product_order_identity BEFORE UPDATE ON public.new_product_store_orders FOR EACH ROW EXECUTE FUNCTION public.prevent_order_reassignment();

ALTER TABLE public.follow_up_tasks ALTER COLUMN assigned_user DROP NOT NULL,
  ADD COLUMN mde_id UUID REFERENCES public.mdes(id) ON DELETE RESTRICT,
  ADD CONSTRAINT task_assignee_present CHECK (assigned_user IS NOT NULL OR mde_id IS NOT NULL);
CREATE FUNCTION public.is_my_task(profile_id UUID, task_mde UUID) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
 SELECT profile_id = auth.uid() OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND mde_id = task_mde);
$$;
DROP POLICY tasks_select_policy ON public.follow_up_tasks;
DROP POLICY tasks_insert_policy ON public.follow_up_tasks;
DROP POLICY tasks_update_policy ON public.follow_up_tasks;
DROP POLICY tasks_delete_policy ON public.follow_up_tasks;
CREATE POLICY tasks_select_policy ON public.follow_up_tasks FOR SELECT TO authenticated USING (public.is_admin() OR public.is_my_task(assigned_user,mde_id));
CREATE POLICY tasks_insert_policy ON public.follow_up_tasks FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR (public.is_my_task(assigned_user,mde_id) AND public.is_store_assigned_to_me(store_id)));
CREATE POLICY tasks_update_policy ON public.follow_up_tasks FOR UPDATE TO authenticated USING (public.is_admin() OR public.is_my_task(assigned_user,mde_id)) WITH CHECK (public.is_admin() OR (public.is_my_task(assigned_user,mde_id) AND public.is_store_assigned_to_me(store_id)));
CREATE POLICY tasks_delete_policy ON public.follow_up_tasks FOR DELETE TO authenticated USING (public.is_admin() OR public.is_my_task(assigned_user,mde_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.new_products, public.new_product_store_orders TO authenticated;

CREATE FUNCTION public.app_apply_changes(changes JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE op JSONB; target TEXT; payload JSONB; column_list TEXT; update_list TEXT; expected RECORD;
        actual_version TEXT; affected INTEGER; total INTEGER := 0; field TEXT; expected_count INTEGER; inserted INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in is required'; END IF;
  IF jsonb_typeof(changes) <> 'array' OR jsonb_array_length(changes) > 24 THEN RAISE EXCEPTION 'Invalid change batch'; END IF;
  FOR op IN SELECT value FROM jsonb_array_elements(changes) LOOP
    target := op->>'table';
    IF target NOT IN ('profiles','channels','sub_channels','stores','promotions','promotion_stores','new_products','new_product_store_orders','follow_up_tasks','order_status_history') THEN RAISE EXCEPTION 'Unsupported table'; END IF;
    FOR expected IN SELECT key, value FROM jsonb_each_text(COALESCE(op->'expected', '{}'::jsonb)) LOOP
      EXECUTE format('SELECT to_jsonb(t)->>''updated_at'' FROM public.%I t WHERE id=$1 FOR UPDATE', target) INTO actual_version USING expected.key::uuid;
      IF actual_version IS NULL OR actual_version::timestamptz IS DISTINCT FROM expected.value::timestamptz THEN
        RAISE EXCEPTION 'This record changed on another device. Reload before retrying.' USING ERRCODE = '40001';
      END IF;
    END LOOP;
    IF op->>'operation' = 'delete' THEN
      payload := op->'ids';
      expected_count := jsonb_array_length(payload);
      EXECUTE format('DELETE FROM public.%I WHERE id IN (SELECT value::uuid FROM jsonb_array_elements_text($1))',target) USING payload;
    ELSIF op->>'operation' = 'upsert' THEN
      payload := op->'rows'; expected_count := jsonb_array_length(payload);
      IF expected_count = 0 OR expected_count > 2000 THEN RAISE EXCEPTION 'Invalid row count'; END IF;
      FOR field IN SELECT jsonb_object_keys(payload->0) LOOP
        IF field IN ('created_at','updated_at') OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=target AND column_name=field) THEN RAISE EXCEPTION 'Unsupported column'; END IF;
      END LOOP;
      IF NOT ((payload->0) ? 'id') THEN RAISE EXCEPTION 'An id is required'; END IF;
      SELECT string_agg(format('%I', key), ', ' ORDER BY key), string_agg(format('%I=source.%I',key,key), ', ' ORDER BY key) FILTER (WHERE key <> 'id')
        INTO column_list, update_list FROM jsonb_object_keys(payload->0) AS fields(key);
      IF update_list IS NULL THEN RAISE EXCEPTION 'No writable fields'; END IF;
      EXECUTE format('UPDATE public.%I AS dest SET %s FROM jsonb_populate_recordset(NULL::public.%I,$1) source WHERE dest.id=source.id',target,update_list,target) USING payload;
      GET DIAGNOSTICS affected = ROW_COUNT;
      EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_recordset(NULL::public.%I,$1) source WHERE NOT EXISTS(SELECT 1 FROM public.%I dest WHERE dest.id=source.id)',target,column_list,column_list,target,target) USING payload;
      GET DIAGNOSTICS inserted = ROW_COUNT;
      IF affected + inserted <> expected_count THEN RAISE EXCEPTION 'Some records could not be saved with this account'; END IF;
      total := total + affected + inserted;
      CONTINUE;
    ELSE RAISE EXCEPTION 'Unsupported operation'; END IF;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> expected_count THEN RAISE EXCEPTION 'Some records could not be saved with this account'; END IF;
    total := total + affected;
  END LOOP;
  RETURN jsonb_build_object('applied',total);
END; $$;
REVOKE ALL ON FUNCTION public.app_apply_changes(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_apply_changes(JSONB) TO authenticated;
COMMIT;
