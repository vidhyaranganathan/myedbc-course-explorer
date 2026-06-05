-- BC Course Finder — Supabase Migration
-- Run this in the Supabase SQL Editor to create all tables from scratch.
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS.
--
-- Schema: 2 tables
--   courses        — one row per (code, grade). All grad program data stored in
--                    grad_info jsonb column to avoid row duplication.
--   course_details — one row per course code. Scraped data from BC Course Registry.
--                    Joins to courses on code.

-- ── Table 1: courses ──────────────────────────────────────────────────────────
-- Source: Excel open_courses.xlsx (12,741 raw rows collapsed to 5,480 unique
-- (code, grade) pairs by aggregating grad programs into the grad_info array).
--
-- grad_info format:
--   [{"program": "2023 Graduation Program", "requirement": "Elective"}, ...]
-- A course with no grad program association has grad_info = '[]'.

CREATE TABLE IF NOT EXISTS courses (
  code         text    NOT NULL,
  grade        text    NOT NULL,
  title        text    NOT NULL,
  credits      text,
  category     text    NOT NULL,
  language     text    NOT NULL DEFAULT 'English',
  subject      text,
  sub_category text,
  myedb_code   text,
  trax_code    text,
  developer    text,
  grad_info    jsonb   NOT NULL DEFAULT '[]',
  PRIMARY KEY (code, grade)
);

-- ── Table 2: course_details ───────────────────────────────────────────────────
-- Source: scrape-course-details.py / course-details.json
-- One row per course code (not per grade). Joins to courses on code.
-- No FK to courses because course_details is keyed by code alone while
-- courses PK is (code, grade) — a single code may span multiple grades.
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

-- Standard B-tree indexes for common filter columns
CREATE INDEX IF NOT EXISTS idx_courses_grade      ON courses (grade);
CREATE INDEX IF NOT EXISTS idx_courses_category   ON courses (category);
CREATE INDEX IF NOT EXISTS idx_courses_subject    ON courses (subject);
CREATE INDEX IF NOT EXISTS idx_courses_language   ON courses (language);
CREATE INDEX IF NOT EXISTS idx_courses_developer  ON courses (developer);

-- GIN index for JSONB containment queries on grad_info, e.g.:
--   WHERE grad_info @> '[{"program": "2023 Graduation Program"}]'
CREATE INDEX IF NOT EXISTS idx_courses_grad_info  ON courses USING GIN (grad_info);
