-- Admin prepares verified-email Sales access without browser-side Auth secrets.
BEGIN;
CREATE TABLE public.app_user_assignments (
  email TEXT PRIMARY KEY CHECK (email = lower(trim(email)) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) > 0),
  mde_id UUID NOT NULL REFERENCES public.mdes(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_user_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_user_assignments FROM anon, authenticated;
GRANT SELECT, DELETE ON public.app_user_assignments TO authenticated;
CREATE POLICY assignments_admin_read ON public.app_user_assignments FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY assignments_admin_delete ON public.app_user_assignments FOR DELETE TO authenticated USING (public.is_admin());

CREATE FUNCTION public.admin_assign_user(user_email TEXT, user_name TEXT, assigned_mde UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE normalized TEXT := lower(trim(user_email)); account_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF normalized IS NULL OR normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR user_name IS NULL OR length(trim(user_name))=0 THEN RAISE EXCEPTION 'A valid email and name are required'; END IF;
  IF assigned_mde IS NULL OR NOT EXISTS(SELECT 1 FROM public.mdes WHERE id=assigned_mde) THEN RAISE EXCEPTION 'Select an existing MDE'; END IF;
  IF EXISTS(SELECT 1 FROM public.app_admin_allowlist WHERE email=normalized) OR EXISTS(SELECT 1 FROM public.profiles WHERE lower(email)=normalized AND role='admin') THEN RAISE EXCEPTION 'An Admin account cannot be assigned as Sales here'; END IF;
  INSERT INTO public.app_user_assignments(email,full_name,mde_id,created_by)
    VALUES(normalized,trim(user_name),assigned_mde,auth.uid())
    ON CONFLICT(email) DO UPDATE SET full_name=EXCLUDED.full_name,mde_id=EXCLUDED.mde_id,created_by=EXCLUDED.created_by,claimed_at=NULL;
  SELECT id INTO account_id FROM auth.users WHERE lower(email)=normalized AND email_confirmed_at IS NOT NULL;
  IF account_id IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM public.profiles WHERE id=account_id AND role='admin') THEN RAISE EXCEPTION 'An Admin account cannot be assigned as Sales here'; END IF;
    INSERT INTO public.profiles(id,email,full_name,role,mde_id) VALUES(account_id,normalized,trim(user_name),'sales',assigned_mde)
    ON CONFLICT(id) DO UPDATE SET full_name=EXCLUDED.full_name,mde_id=EXCLUDED.mde_id;
    UPDATE public.app_user_assignments SET claimed_at=now() WHERE email=normalized;
    RETURN 'assigned';
  END IF;
  RETURN 'pending';
END; $$;
REVOKE ALL ON FUNCTION public.admin_assign_user(TEXT,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_user(TEXT,TEXT,UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_my_profile() RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE account auth.users; result public.profiles; owner BOOLEAN; assignment public.app_user_assignments;
BEGIN
  SELECT * INTO account FROM auth.users WHERE id=auth.uid();
  IF account.id IS NULL OR account.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'A verified account is required'; END IF;
  owner := EXISTS(SELECT 1 FROM public.app_admin_allowlist WHERE email=lower(account.email));
  SELECT * INTO assignment FROM public.app_user_assignments WHERE email=lower(account.email) AND claimed_at IS NULL FOR UPDATE;
  INSERT INTO public.profiles(id,email,full_name,role,mde_id)
    VALUES(account.id,account.email,CASE WHEN owner THEN 'Admin' ELSE coalesce(assignment.full_name,split_part(account.email,'@',1)) END,CASE WHEN owner THEN 'admin' ELSE 'sales' END,CASE WHEN owner THEN NULL ELSE assignment.mde_id END)
    ON CONFLICT(id) DO NOTHING;
  IF owner THEN UPDATE public.profiles SET role='admin',mde_id=NULL WHERE id=account.id;
  ELSIF assignment.email IS NOT NULL THEN
    UPDATE public.profiles SET full_name=assignment.full_name,mde_id=assignment.mde_id WHERE id=account.id AND role='sales';
  END IF;
  IF assignment.email IS NOT NULL THEN UPDATE public.app_user_assignments SET claimed_at=now() WHERE email=assignment.email; END IF;
  SELECT * INTO result FROM public.profiles WHERE id=account.id;
  RETURN result;
END; $$;
COMMIT;
