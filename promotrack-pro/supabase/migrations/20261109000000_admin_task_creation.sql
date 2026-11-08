-- Only Admin creates tasks. Existing MDE task updates remain permitted.
-- app_apply_changes updates existing rows before inserting missing rows, so
-- its existing update path does not require a permissive INSERT policy.
BEGIN;
DROP POLICY tasks_insert_policy ON public.follow_up_tasks;
CREATE POLICY tasks_insert_policy ON public.follow_up_tasks FOR INSERT
 TO authenticated WITH CHECK (public.is_admin());
COMMIT;
