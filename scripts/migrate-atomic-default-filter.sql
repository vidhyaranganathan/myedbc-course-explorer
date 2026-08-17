-- ============================================================
-- Incremental migration (TD-023): replace the two-round-trip
-- clear-then-insert/update pattern for setting a default saved
-- filter set with atomic single-transaction RPC functions.
-- Run in Supabase SQL Editor AFTER scripts/migrate-clerk-auth.sql
-- has already been applied (saved_filter_sets.user_id is TEXT).
-- ============================================================

CREATE OR REPLACE FUNCTION insert_default_filter_set(
  p_user_id text,
  p_name    text,
  p_filters jsonb
)
RETURNS SETOF saved_filter_sets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.saved_filter_sets
     SET is_default = false
   WHERE user_id = p_user_id AND is_default = true;

  RETURN QUERY
  INSERT INTO public.saved_filter_sets (user_id, name, is_default, filters)
  VALUES (p_user_id, p_name, true, p_filters)
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION set_default_filter_set(
  p_user_id text,
  p_id      uuid,
  p_name    text DEFAULT NULL,
  p_filters jsonb DEFAULT NULL
)
RETURNS SETOF saved_filter_sets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Ownership check: return zero rows (not an error) if the row isn't the
  -- caller's — the route treats "no row returned" as its existing 404 case.
  IF NOT EXISTS (
    SELECT 1 FROM public.saved_filter_sets WHERE id = p_id AND user_id = p_user_id
  ) THEN
    RETURN;
  END IF;

  UPDATE public.saved_filter_sets
     SET is_default = false
   WHERE user_id = p_user_id AND is_default = true AND id <> p_id;

  RETURN QUERY
  UPDATE public.saved_filter_sets
     SET is_default = true,
         name       = COALESCE(p_name, name),
         filters    = COALESCE(p_filters, filters)
   WHERE id = p_id AND user_id = p_user_id
   RETURNING *;
END;
$$;

-- If supabase.rpc(...) 404s immediately after running this, run:
-- NOTIFY pgrst, 'reload schema';
