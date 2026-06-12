-- BC Course Finder — Supabase Migration
-- Run this in the Supabase SQL Editor to create all tables from scratch.
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS.
--
-- To reset: DROP TABLE IF EXISTS course_details, courses CASCADE; then re-run.
--
-- Schema: 2 tables
--   courses        — one row per (code, grade), filtered to 2023 Graduation Program only.
--                    Source: BC Ministry Excel (live URL, see load_supabase.ts).
--                    Grades 10, 11, 12 only — Grade 9 is not part of the 2023 program.
--   course_details — one row per course code. Scraped data from BC Course Registry.
--                    Joins to courses on code.

-- ── Table 1: courses ──────────────────────────────────────────────────────────
-- Source: open_courses.xlsx from BC Ministry of Education (downloaded at load time)
-- Filtered to Grad Program = "2023 Graduation Program" → 3,951 unique (code, grade) rows.
-- Each course appears exactly once at this filter — no deduplication needed.
--
-- grad_requirement: "Grad Program Requirement" value for the 2023 program
--   (e.g. "Elective", "Required").
-- myedb_code: MyEd BC Code — cross-reference for parents checking student timetables.
-- trax_code:  TRAX Code — used by TRAX reporting system.
-- developer:  Organisation that developed the course (e.g. IB, SkilledTradesBC, Ministry).
--
-- Columns excluded intentionally:
--   authorizer, open_date, ministry_subject_code — not needed for current app features.
--   close_date, completion_end_date — do not exist in the source Excel file.

CREATE TABLE IF NOT EXISTS courses (
  code             text NOT NULL,
  grade            text NOT NULL,
  title            text NOT NULL,
  credits          text,
  category         text NOT NULL,
  language         text NOT NULL DEFAULT 'English',
  subject          text,
  sub_category     text,
  myedb_code       text,
  trax_code        text,
  developer        text,
  grad_requirement text,
  PRIMARY KEY (code, grade)
);

-- ── Table 2: course_details ───────────────────────────────────────────────────
-- One row per course code (not per grade). Joins to courses on code. Populated
-- only through the write API (POST /api/courses) — see ADR-007.
-- No FK to courses: course_details is keyed by code alone while courses PK
-- is (code, grade).
--
-- grad_requirements and grad_electives are stored as JSONB arrays from the scraper.
-- These reflect data across all grad programs — preserved for future use (e.g. R-004).
--
-- grad_requirements format:
--   [{"program": "Program End Date", "requirement": "2018 Graduation Program",
--     "examinable": "2017-06-01"}, ...]
--
-- grad_electives format:
--   ["2023 Graduation Program", "Adult Graduation Program", ...]

CREATE TABLE IF NOT EXISTS course_details (
  code                  text  PRIMARY KEY,
  generic_course_type   text,
  program_guide_title   text,
  published_description text,
  grad_requirements     jsonb NOT NULL DEFAULT '[]',
  grad_electives        jsonb NOT NULL DEFAULT '[]'
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_courses_grade        ON courses (grade);
CREATE INDEX IF NOT EXISTS idx_courses_category     ON courses (category);
CREATE INDEX IF NOT EXISTS idx_courses_subject      ON courses (subject);
CREATE INDEX IF NOT EXISTS idx_courses_language     ON courses (language);
CREATE INDEX IF NOT EXISTS idx_courses_developer    ON courses (developer);
CREATE INDEX IF NOT EXISTS idx_courses_grad_req     ON courses (grad_requirement);

-- ── Constraint: course code is globally unique ────────────────────────────────
-- The PK is (code, grade), but every read path and the UI treat `code` as the
-- course identity (the detail route, the React keys, the detail cache). The data
-- confirms it — 0 codes span more than one grade. This constraint makes the
-- invariant explicit so a future load that violates it fails loudly instead of
-- silently corrupting reads (TD-016). Idempotent — safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_code_unique') THEN
    ALTER TABLE courses ADD CONSTRAINT courses_code_unique UNIQUE (code);
  END IF;
END $$;
