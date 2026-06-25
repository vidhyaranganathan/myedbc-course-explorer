-- ============================================================
-- User DB exploration schema for myedbc-course-explorer
-- Run in Supabase SQL Editor AFTER migrate.sql
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────
-- Email and password are managed by Supabase Auth in auth.users.
-- profiles stores only app-specific data. Never duplicate email here.

CREATE TABLE public.profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
CREATE POLICY "own profile"
  ON public.profiles
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── saved_filter_sets ─────────────────────────────────────────

CREATE TABLE public.saved_filter_sets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE POLICY "own filter sets"
  ON public.saved_filter_sets
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

-- Auto-create a profiles row when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;  -- idempotent in case of retries
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── example operations (commented out — for reference) ────────

/*
-- Save a filter set
INSERT INTO saved_filter_sets (user_id, name, is_default, filters)
VALUES (
  auth.uid(),
  'Grade 11 Science French',
  false,
  '{"grades": ["11"], "languages": ["French"], "categories": [], "subjects": ["Science"], "searchTerm": ""}'
);

-- Set a filter as default (must clear old default first, in a transaction)
BEGIN;
  UPDATE saved_filter_sets SET is_default = false WHERE user_id = auth.uid() AND is_default = true;
  UPDATE saved_filter_sets SET is_default = true  WHERE id = '<target-id>' AND user_id = auth.uid();
COMMIT;

-- Load default filter set on page open
SELECT filters FROM saved_filter_sets
WHERE user_id = auth.uid() AND is_default = true
LIMIT 1;

-- List all saved filter sets for the user
SELECT id, name, is_default, created_at FROM saved_filter_sets
WHERE user_id = auth.uid()
ORDER BY is_default DESC, created_at DESC;
*/
