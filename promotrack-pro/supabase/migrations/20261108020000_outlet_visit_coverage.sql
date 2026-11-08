-- Additive visit tracking. Existing roles, tables and sync RPC are unchanged.
BEGIN;
CREATE TABLE public.outlet_visits (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
 mde_id UUID NOT NULL REFERENCES public.mdes(id) ON DELETE RESTRICT,
 -- Immutable actor snapshot; deleting an account must not erase visit history.
 visited_by UUID NOT NULL,
 visited_on DATE NOT NULL,
 note TEXT NOT NULL DEFAULT '' CHECK (char_length(note)<=2000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT outlet_visit_not_future CHECK (visited_on <= (now() AT TIME ZONE 'Asia/Bangkok')::date),
 CONSTRAINT outlet_visit_once_per_day UNIQUE(store_id,mde_id,visited_on)
);
CREATE INDEX outlet_visits_period ON public.outlet_visits(visited_on,mde_id,store_id);
CREATE INDEX outlet_visits_store_history ON public.outlet_visits(store_id,visited_on DESC);

CREATE FUNCTION public.can_record_outlet_visit(outlet UUID, visit_mde UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.stores s ON s.id=outlet
 WHERE p.id=auth.uid() AND p.role='sales' AND p.mde_id IS NOT NULL
 AND p.mde_id=visit_mde AND s.mde_id=p.mde_id AND s.is_active);
$$;
REVOKE ALL ON FUNCTION public.can_record_outlet_visit(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_record_outlet_visit(UUID,UUID) TO authenticated;

CREATE FUNCTION public.prepare_outlet_visit() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE actor_mde UUID;
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT p.mde_id INTO actor_mde FROM public.profiles p
   WHERE p.id=auth.uid() AND p.role='sales' AND p.mde_id IS NOT NULL;
  IF actor_mde IS NULL THEN RAISE EXCEPTION 'An assigned MDE account is required'; END IF;
  IF NOT public.can_record_outlet_visit(NEW.store_id,actor_mde) THEN
   RAISE EXCEPTION 'This outlet is outside your active MDE assignment';
  END IF;
  NEW.mde_id:=actor_mde; NEW.visited_by:=auth.uid(); NEW.created_at:=clock_timestamp();
 ELSE
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.store_id IS DISTINCT FROM OLD.store_id
   OR NEW.mde_id IS DISTINCT FROM OLD.mde_id OR NEW.visited_by IS DISTINCT FROM OLD.visited_by
   OR NEW.visited_on IS DISTINCT FROM OLD.visited_on OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Visit identity and date cannot be changed';
  END IF;
 END IF;
 NEW.note:=btrim(coalesce(NEW.note,'')); NEW.updated_at:=clock_timestamp();
 RETURN NEW;
END;
$$;
CREATE TRIGGER outlet_visit_identity BEFORE INSERT OR UPDATE ON public.outlet_visits
 FOR EACH ROW EXECUTE FUNCTION public.prepare_outlet_visit();
ALTER TABLE public.outlet_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY outlet_visits_read ON public.outlet_visits FOR SELECT TO authenticated
 USING(public.is_admin() OR public.can_record_outlet_visit(store_id,mde_id));
CREATE POLICY outlet_visits_insert ON public.outlet_visits FOR INSERT TO authenticated
 WITH CHECK(visited_by=auth.uid() AND public.can_record_outlet_visit(store_id,mde_id));
CREATE POLICY outlet_visits_update ON public.outlet_visits FOR UPDATE TO authenticated
 USING(visited_by=auth.uid() AND public.can_record_outlet_visit(store_id,mde_id))
 WITH CHECK(visited_by=auth.uid() AND public.can_record_outlet_visit(store_id,mde_id));
CREATE POLICY outlet_visits_delete ON public.outlet_visits FOR DELETE TO authenticated
 USING(visited_by=auth.uid() AND public.can_record_outlet_visit(store_id,mde_id));
REVOKE ALL ON public.outlet_visits FROM anon,authenticated;
GRANT SELECT,DELETE ON public.outlet_visits TO authenticated;
GRANT INSERT(store_id,visited_on,note),UPDATE(note) ON public.outlet_visits TO authenticated;

-- One JSON aggregate avoids PostgREST's row cap and pagination races for 1178+
-- outlets. SECURITY INVOKER keeps RLS in force; raw histories load on demand.
CREATE FUNCTION public.outlet_visit_coverage(p_start DATE,p_end DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE result JSONB;
BEGIN
 IF p_start IS NULL OR p_end IS NULL OR p_end<p_start OR p_end-p_start>365 THEN
  RAISE EXCEPTION 'Choose a valid reporting period of at most one year';
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(summary) ORDER BY summary.store_id,summary.mde_id),'[]'::jsonb)
 INTO result FROM (
  SELECT v.store_id,v.mde_id,count(*) AS visit_count,max(v.visited_on) AS last_visited_on
  FROM public.outlet_visits v WHERE v.visited_on BETWEEN p_start AND p_end
  GROUP BY v.store_id,v.mde_id
 ) summary;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.outlet_visit_coverage(DATE,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.outlet_visit_coverage(DATE,DATE) TO authenticated;
COMMIT;
