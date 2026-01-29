-- Views for analytics and common queries

-- Active courses view (no close date = still open)
CREATE OR REPLACE VIEW active_courses AS
SELECT *
FROM courses
WHERE close_date IS NULL
  AND code IS NOT NULL
  AND grade IS NOT NULL
  AND course_title IS NOT NULL
  AND category IS NOT NULL;

-- Courses aggregated by grade
CREATE OR REPLACE VIEW courses_by_grade AS
SELECT
    grade,
    COUNT(*) as course_count,
    COUNT(DISTINCT code) as unique_codes,
    COUNT(DISTINCT category) as categories
FROM courses
WHERE close_date IS NULL
GROUP BY grade
ORDER BY
    CASE
        WHEN grade ~ '^\d+$' THEN LPAD(grade, 2, '0')
        ELSE grade
    END;

-- Courses aggregated by category
CREATE OR REPLACE VIEW courses_by_category AS
SELECT
    category,
    COUNT(*) as course_count,
    COUNT(DISTINCT code) as unique_codes,
    COUNT(DISTINCT grade) as grades
FROM courses
WHERE close_date IS NULL
GROUP BY category
ORDER BY category;

-- Courses by subject (HST Main Category)
CREATE OR REPLACE VIEW courses_by_subject AS
SELECT
    hst_main_category as subject,
    COUNT(*) as course_count,
    COUNT(DISTINCT code) as unique_codes,
    COUNT(DISTINCT grade) as grades
FROM courses
WHERE close_date IS NULL
  AND hst_main_category IS NOT NULL
GROUP BY hst_main_category
ORDER BY hst_main_category;

-- Search statistics view
CREATE OR REPLACE VIEW search_stats AS
SELECT
    DATE_TRUNC('day', searched_at) as search_date,
    COUNT(*) as total_searches,
    AVG(result_count)::INTEGER as avg_results,
    AVG(response_time_ms)::INTEGER as avg_response_time_ms,
    COUNT(CASE WHEN result_count = 0 THEN 1 END) as zero_result_searches
FROM search_logs
GROUP BY DATE_TRUNC('day', searched_at)
ORDER BY search_date DESC;

-- Top search queries view
CREATE OR REPLACE VIEW top_searches AS
SELECT
    query,
    COUNT(*) as search_count,
    AVG(result_count)::INTEGER as avg_results
FROM search_logs
WHERE query IS NOT NULL AND query != ''
GROUP BY query
ORDER BY search_count DESC
LIMIT 100;
