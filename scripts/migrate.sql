-- BC Course Finder — Supabase Migration
-- Run this in the Supabase SQL Editor to create all tables from scratch.
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS.

-- ── Table 1: courses ──────────────────────────────────────────────────────────
-- One row per (code, grade) offering.
-- Source: Excel open_courses.xlsx
-- PK is (code, grade) — same course code can exist at multiple grades.

CREATE TABLE IF NOT EXISTS courses (
  code                  text  NOT NULL,
  grade                 text  NOT NULL,
  title                 text  NOT NULL,
  credits               text,
  category              text  NOT NULL,
  language              text  NOT NULL DEFAULT 'English',
  subject               text,
  sub_category          text,
  myedb_code            text,
  trax_code             text,
  developer             text,
  authorizer            text,
  open_date             date,
  close_date            date,
  completion_end_date   date,
  ministry_subject_code text,
  PRIMARY KEY (code, grade)
);

-- ── Table 2: course_grad_programs ─────────────────────────────────────────────
-- One row per (code, grade, grad_program) — preserves all 12,741 raw Excel rows.
-- Source: Excel open_courses.xlsx

CREATE TABLE IF NOT EXISTS course_grad_programs (
  course_code      text NOT NULL,
  course_grade     text NOT NULL,
  grad_program     text NOT NULL,
  grad_requirement text,
  PRIMARY KEY (course_code, course_grade, grad_program),
  FOREIGN KEY (course_code, course_grade) REFERENCES courses (code, grade) ON DELETE CASCADE
);

-- ── Table 3: course_details ───────────────────────────────────────────────────
-- One row per course code (not per grade).
-- Source: scrape-course-details.py / course-details.json

CREATE TABLE IF NOT EXISTS course_details (
  code                  text PRIMARY KEY,
  generic_course_type   text,
  program_guide_title   text,
  published_description text
);

-- ── Table 4: course_grad_requirements ─────────────────────────────────────────
-- Graduation requirement entries per course code.
-- Source: scrape-course-details.py / course-details.json

CREATE TABLE IF NOT EXISTS course_grad_requirements (
  course_code     text NOT NULL,
  requirement     text NOT NULL,
  examinable_date text NOT NULL,
  program_end     text,
  PRIMARY KEY (course_code, requirement, examinable_date),
  FOREIGN KEY (course_code) REFERENCES course_details (code) ON DELETE CASCADE
);

-- ── Table 5: course_grad_electives ────────────────────────────────────────────
-- Which grad programs a course counts as an elective in.
-- Source: scrape-course-details.py / course-details.json
-- Stores actual program names instead of a boolean flag.

CREATE TABLE IF NOT EXISTS course_grad_electives (
  course_code  text NOT NULL,
  grad_program text NOT NULL,
  PRIMARY KEY (course_code, grad_program),
  FOREIGN KEY (course_code) REFERENCES course_details (code) ON DELETE CASCADE
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_courses_grade      ON courses (grade);
CREATE INDEX IF NOT EXISTS idx_courses_category   ON courses (category);
CREATE INDEX IF NOT EXISTS idx_courses_subject    ON courses (subject);
CREATE INDEX IF NOT EXISTS idx_courses_language   ON courses (language);
CREATE INDEX IF NOT EXISTS idx_grad_programs_code ON course_grad_programs (course_code);
