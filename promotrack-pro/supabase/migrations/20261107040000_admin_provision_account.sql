-- Only the trusted server function can finalize an Admin-created Auth account.
BEGIN;
CREATE FUNCTION public.app_provision_mde_account(account_id UUID, account_email TEXT, account_name TEXT, assigned_mde UUID, account_avatar TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=account_id AND lower(email)=lower(account_email) AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified Auth account required'; END IF;
  IF EXISTS(SELECT 1 FROM public.app_admin_allowlist WHERE email=lower(account_email)) OR EXISTS(SELECT 1 FROM public.profiles WHERE id=account_id AND role='admin') THEN RAISE EXCEPTION 'Cannot replace an Admin account'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.mdes WHERE id=assigned_mde) OR length(trim(account_name))=0 THEN RAISE EXCEPTION 'Name and existing MDE required'; END IF;
  INSERT INTO public.profiles(id,email,full_name,role,mde_id,avatar_url) VALUES(account_id,lower(account_email),trim(account_name),'sales',assigned_mde,account_avatar)
  ON CONFLICT(id) DO UPDATE SET full_name=EXCLUDED.full_name,mde_id=EXCLUDED.mde_id,avatar_url=EXCLUDED.avatar_url;
  DELETE FROM public.app_user_assignments WHERE email=lower(account_email);
END; $$;
REVOKE ALL ON FUNCTION public.app_provision_mde_account(UUID,TEXT,TEXT,UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_provision_mde_account(UUID,TEXT,TEXT,UUID,TEXT) TO service_role;
COMMIT;
