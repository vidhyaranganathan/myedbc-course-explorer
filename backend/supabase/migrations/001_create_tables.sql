-- BC Course Finder Database Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For trigram similarity search

-- Main courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,

    -- Core identifiers
    code VARCHAR(20) NOT NULL,              -- Course Code
    myedbc_code VARCHAR(50),                -- MyEd BC Code
    trax_code VARCHAR(50),                  -- TRAX Code

    -- Course details
    grade VARCHAR(10) NOT NULL,             -- Grade (K, 01-12)
    course_title TEXT NOT NULL,             -- Course Title
    credit_value VARCHAR(20),               -- Credit Value (stored as string: "1,2,4")
    category VARCHAR(100) NOT NULL,         -- Course Category
    language VARCHAR(20) NOT NULL DEFAULT 'English',  -- Lang Of Inst

    -- Administrative
    developer TEXT,                         -- Developer
    authorizer TEXT,                        -- Authorizer
    open_date DATE,                         -- Open Date
    close_date DATE,                        -- Close Date
    completion_end_date DATE,               -- Completion End Date

    -- Graduation requirements
    grad_program TEXT,                      -- Grad Program
    grad_program_requirement TEXT,          -- Grad Program Requirement

    -- Subject categorization
    hst_main_category TEXT,                 -- HST Main Category
    hst_sub_category TEXT,                  -- HST Sub Category
    ministry_subject_code VARCHAR(100),     -- Ministry Subject Code

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data imports tracking table
CREATE TABLE IF NOT EXISTS data_imports (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    rows_imported INTEGER NOT NULL DEFAULT 0,
    rows_failed INTEGER NOT NULL DEFAULT 0,
    errors JSONB,
    imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search analytics table
CREATE TABLE IF NOT EXISTS search_logs (
    id SERIAL PRIMARY KEY,
    query VARCHAR(200),
    filters JSONB,
    result_count INTEGER NOT NULL DEFAULT 0,
    response_time_ms INTEGER NOT NULL DEFAULT 0,
    searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_grade ON courses(grade);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_language ON courses(language);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(ministry_subject_code);
CREATE INDEX IF NOT EXISTS idx_courses_hst_main ON courses(hst_main_category);

-- Full-text search index using trigrams
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm ON courses USING gin(course_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_courses_code_trgm ON courses USING gin(code gin_trgm_ops);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_courses_grade_category ON courses(grade, category);
CREATE INDEX IF NOT EXISTS idx_courses_grade_language ON courses(grade, language);

-- Search logs index
CREATE INDEX IF NOT EXISTS idx_search_logs_searched_at ON search_logs(searched_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for courses
CREATE POLICY "Allow public read access to courses"
    ON courses FOR SELECT
    USING (true);

-- Service role write access for courses (for import script)
CREATE POLICY "Allow service role write access to courses"
    ON courses FOR ALL
    USING (auth.role() = 'service_role');

-- Public insert for search logs (for analytics)
CREATE POLICY "Allow public insert to search_logs"
    ON search_logs FOR INSERT
    WITH CHECK (true);

-- Service role access to data_imports
CREATE POLICY "Allow service role access to data_imports"
    ON data_imports FOR ALL
    USING (auth.role() = 'service_role');
