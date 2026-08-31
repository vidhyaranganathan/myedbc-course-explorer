-- ============================================================
-- User DB exploration schema for myedbc-course-explorer
-- Run in Supabase SQL Editor AFTER migrate.sql
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────
-- Identity (email, password, social login) is managed by Clerk, not
-- Supabase — id is Clerk's user id (e.g. "user_2abc..."), a plain TEXT
-- primary key with no DB-level FK (ADR-010). profiles stores only
-- app-specific data. Never duplicate email here.

CREATE TABLE public.profiles (
  id             TEXT        PRIMARY KEY,
  role           TEXT        CHECK (role IN ('student', 'parent', 'counselor', 'teacher')),
  grade_interest INTEGER[]   CHECK (grade_interest <@ ARRAY[10, 11, 12]),
  school         TEXT,
  district       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Students can only read and write their own row.
-- No cross-user reads — a student cannot see another student's profile.
-- auth.uid() is a Supabase Auth concept and is always NULL under Clerk
-- (ADR-010) — the ::text cast only exists so this still type-checks
-- against the TEXT id column. The policy is permanently decorative:
-- every route goes through the service-role client, which bypasses RLS
-- entirely, and the real per-user enforcement is the route handler's
-- own `user_id` scoping.
CREATE POLICY "own profile"
  ON public.profiles
  USING      (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ── saved_filter_sets ─────────────────────────────────────────

CREATE TABLE public.saved_filter_sets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  is_default  BOOLEAN     NOT NULL DEFAULT false,
  filters     JSONB       NOT NULL DEFAULT '{}',
  share_token TEXT        UNIQUE DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce at most one default per user at the DB level
CREATE UNIQUE INDEX one_default_per_user
  ON public.saved_filter_sets (user_id)
  WHERE is_default = true;

-- Fast lookup of all sets for a user
CREATE INDEX saved_filter_sets_user_id ON public.saved_filter_sets (user_id);

ALTER TABLE public.saved_filter_sets ENABLE ROW LEVEL SECURITY;

-- Same decorative-only caveat as the "own profile" policy above.
CREATE POLICY "own filter sets"
  ON public.saved_filter_sets
  USING      (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ── triggers ──────────────────────────────────────────────────

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER saved_filter_sets_updated_at
  BEFORE UPDATE ON public.saved_filter_sets
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- No signup trigger: Clerk owns identity, so there's no auth.users INSERT
-- to hang one off (ADR-010). A profiles row is created lazily by the
-- self-healing upsert in PATCH /api/user/profile on first save instead.

-- ── atomic default-filter-set functions (TD-023) ────────────────
-- Both functions clear the old default and set the new one inside a single
-- function call (one Supabase RPC round trip = one transaction), so a
-- mid-flight failure can never leave a user with zero defaults. The
-- one_default_per_user partial unique index remains the backstop for
-- genuinely concurrent requests (the route handlers turn its violation
-- into a 409 for the client to retry).
--
-- p_user_id is TEXT (a Clerk id like "user_2abc...") — not uuid — since
-- saved_filter_sets.user_id is TEXT post-Clerk-migration (ADR-010).
--
-- After running this in the SQL Editor, PostgREST's schema cache usually
-- reloads within seconds. If supabase.rpc(...) 404s immediately after,
-- run: NOTIFY pgrst, 'reload schema';

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

-- ── example operations (commented out — for reference) ────────
-- These run via the service-role client with an explicit Clerk user id
-- (from getSessionUser()), not as an authenticated Supabase SQL session —
-- there's no auth.uid() to rely on here (ADR-010). '<user-id>' below is a
-- Clerk id like "user_2abc...".

/*
-- Save a filter set
INSERT INTO saved_filter_sets (user_id, name, is_default, filters)
VALUES (
  '<user-id>',
  'Grade 11 Science French',
  false,
  '{"grades": ["11"], "languages": ["French"], "categories": [], "subjects": ["Science"], "searchTerm": ""}'
);

-- Set a filter as default (atomic — see set_default_filter_set above)
SELECT * FROM set_default_filter_set('<user-id>', '<target-id>');

-- Load default filter set on page open
SELECT filters FROM saved_filter_sets
WHERE user_id = '<user-id>' AND is_default = true
LIMIT 1;

-- List all saved filter sets for the user
SELECT id, name, is_default, created_at FROM saved_filter_sets
WHERE user_id = '<user-id>'
ORDER BY is_default DESC, created_at DESC;
*/
