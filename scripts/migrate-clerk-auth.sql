-- ============================================================
-- Incremental migration: switch profiles/saved_filter_sets from
-- Supabase Auth (auth.users UUID FK) to Clerk (plain TEXT user id).
-- Run in Supabase SQL Editor AFTER scripts/user-schema.sql has
-- already been applied (ADR-010).
-- ============================================================

ALTER TABLE public.saved_filter_sets DROP CONSTRAINT saved_filter_sets_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;

-- Policies referencing these columns must be dropped before the type
-- change — Postgres won't alter a column's type while an RLS policy
-- expression still typechecks it against the old type.
DROP POLICY "own profile" ON public.profiles;
DROP POLICY "own filter sets" ON public.saved_filter_sets;

ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.saved_filter_sets ALTER COLUMN user_id TYPE TEXT;

-- Recreated with a ::text cast so they still typecheck. auth.uid() is a
-- Supabase Auth concept and is always NULL under Clerk (ADR-010), so these
-- are now permanently decorative — every route uses the service-role
-- client, which bypasses RLS; real enforcement is the route handler's own
-- `user_id` scoping.
CREATE POLICY "own profile"
  ON public.profiles
  USING      (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "own filter sets"
  ON public.saved_filter_sets
  USING      (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- No auth.users INSERT to hang a signup trigger off anymore — profile
-- bootstrap is now the self-healing upsert in PATCH /api/user/profile.
DROP TRIGGER on_auth_user_created ON auth.users;
DROP FUNCTION handle_new_user();
