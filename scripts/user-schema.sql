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

-- Set a filter as default (must clear old default first, in a transaction)
BEGIN;
  UPDATE saved_filter_sets SET is_default = false WHERE user_id = '<user-id>' AND is_default = true;
  UPDATE saved_filter_sets SET is_default = true  WHERE id = '<target-id>' AND user_id = '<user-id>';
COMMIT;

-- Load default filter set on page open
SELECT filters FROM saved_filter_sets
WHERE user_id = '<user-id>' AND is_default = true
LIMIT 1;

-- List all saved filter sets for the user
SELECT id, name, is_default, created_at FROM saved_filter_sets
WHERE user_id = '<user-id>'
ORDER BY is_default DESC, created_at DESC;
*/
