-- Keep NPD follow-ups linked to the product without guessing from task titles.
BEGIN;
ALTER TABLE public.follow_up_tasks ADD COLUMN product_id UUID REFERENCES public.new_products(id) ON DELETE SET NULL;
CREATE INDEX follow_up_tasks_product_idx ON public.follow_up_tasks(product_id) WHERE product_id IS NOT NULL;
COMMIT;
