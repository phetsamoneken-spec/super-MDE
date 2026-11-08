-- Supabase projects can grant anon EXECUTE through default privileges.
-- Revoke its explicit grant as well as PUBLIC; invoker RLS remains in force.
BEGIN;
REVOKE ALL ON FUNCTION public.can_record_outlet_visit(UUID,UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.outlet_visit_coverage(DATE,DATE) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_record_outlet_visit(UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.outlet_visit_coverage(DATE,DATE) TO authenticated;
COMMIT;
