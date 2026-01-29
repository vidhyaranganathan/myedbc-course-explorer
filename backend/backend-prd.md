# Product Requirements Document: BC Course Finder Backend

## Overview
Backend system for BC Course Finder that manages course data, provides search APIs, and tracks analytics. Must run entirely on free tiers (Vercel + Supabase).

## Data Source Analysis

### Excel File Structure
**File:** `open_courses.xlsx`
- **Total Records:** 12,741 courses
- **Unique Course Codes:** 5,480
- **File Size:** 926 KB

### Columns (18 total)
1. **Course Code** (int64) - Primary identifier, NOT NULL
2. **Grade** (string) - Values: K, 01-12 (13 unique values)
3. **Course Title** (string) - Full course name, NOT NULL
4. **Credit Value** (string) - Can be: "4", "1,2,4", "2,4", "1,2,3,4", etc. (783 nulls)
5. **MyEd BC Code** (string) - Secondary identifier
6. **TRAX Code** (string) - Transcript code (646 nulls)
7. **Course Category** (string) - 4 types: External Credential, Ministry, Board Authority Authorized, Locally Developed
8. **Lang Of Inst** (string) - English or French
9. **Developer** (string) - Organization that created course
10. **Authorizer** (string) - Organization that approved course
11. **Open Date** (date) - When course became available
12. **Close Date** (date) - When course closes (all null = all courses are open)
13. **Completion End Date** (date) - (all null)
14. **Grad Program** (string) - e.g., "2023 Graduation Program" (1,500 nulls)
15. **Grad Program Requirement** (string) - e.g., "Elective", "Grade 12,Elective" (1,500 nulls)
16. **HST Main Category** (string) - High-level subject categorization
17. **HST Sub Category** (string) - Detailed subject categorization
18. **Ministry Subject Code** (string) - BC Ministry classification

### Key Data Insights
- **Grade Distribution:** 71% are Grade 12 courses (9,098), then Grade 11 (2,075), Grade 10 (922)
- **Course Categories:** External Credential (70%), Ministry (21%), Board Authority (6%), Locally Developed (3%)
- **Languages:** English (88%), French (12%)
- **Credit Values:** Most common is "4" (45%), then "1,2,4" (26%), then "2,4" (12%)
- **Duplicates:** Same course code can appear multiple times for different graduation programs

## Technical Architecture

### Tech Stack
- **Backend Framework:** Next.js 14 App Router (API routes)
- **Database:** Supabase (PostgreSQL + pgvector)
- **Hosting:** Vercel (free tier)
- **Caching:** Vercel KV (Redis)
- **File Storage:** Supabase Storage (for future features)

### Database Schema

#### Main Table: `courses`
```sql
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  
  -- Core identifiers
  course_code VARCHAR(20) NOT NULL,
  myedbc_code VARCHAR(50),
  trax_code VARCHAR(50),
  
  -- Course details
  grade VARCHAR(10) NOT NULL,
  course_title TEXT NOT NULL,
  credit_value VARCHAR(20), -- Stored as string: "1,2,4"
  course_category VARCHAR(100) NOT NULL,
  language VARCHAR(20) NOT NULL,
  
  -- Administrative
  developer TEXT,
  authorizer TEXT,
  open_date DATE NOT NULL,
  close_date DATE,
  completion_end_date DATE,
  
  -- Graduation requirements
  grad_program TEXT,
  grad_program_requirement TEXT,
  
  -- Subject categorization
  hst_main_category TEXT,
  hst_sub_category TEXT,
  ministry_subject_code VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint (same code can exist for different grad programs)
  UNIQUE(course_code, grade, grad_program)
);
```

#### Supporting Tables

**`data_imports`** - Track data refresh history
```sql
CREATE TABLE data_imports (
  id SERIAL PRIMARY KEY,
  import_date TIMESTAMP DEFAULT NOW(),
  source_file TEXT,
  total_records INTEGER,
  successful_imports INTEGER,
  failed_imports INTEGER,
  notes TEXT
);
```

**`search_logs`** - Anonymous analytics
```sql
CREATE TABLE search_logs (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  filters JSONB,
  result_count INTEGER,
  clicked_course_codes TEXT[],
  timestamp TIMESTAMP DEFAULT NOW()
);
```

#### Indexes (Performance Critical)
```sql
-- Basic lookups
CREATE INDEX idx_courses_grade ON courses(grade);
CREATE INDEX idx_courses_category ON courses(course_category);
CREATE INDEX idx_courses_language ON courses(language);
CREATE INDEX idx_courses_code ON courses(course_code);
CREATE INDEX idx_courses_subject ON courses(ministry_subject_code);

-- Full-text search
CREATE INDEX idx_courses_title ON courses USING gin(to_tsvector('english', course_title));
CREATE INDEX idx_courses_search ON courses USING gin(
  to_tsvector('english', 
    coalesce(course_title, '') || ' ' || 
    coalesce(course_code::text, '') || ' ' ||
    coalesce(hst_sub_category, '')
  )
);
```

#### Views
```sql
-- Active courses only (no close date)
CREATE VIEW active_courses AS
SELECT * FROM courses WHERE close_date IS NULL;

-- Analytics views
CREATE VIEW courses_by_grade AS
SELECT grade, COUNT(*) as total, COUNT(DISTINCT course_code) as unique_courses
FROM courses WHERE close_date IS NULL
GROUP BY grade;

CREATE VIEW courses_by_category AS
SELECT course_category, COUNT(*) as total
FROM courses WHERE close_date IS NULL
GROUP BY course_category;
```

## API Endpoints

### 1. Search Courses
**Endpoint:** `GET /api/courses/search`

**Query Parameters:**
- `q` (string, optional) - Search query (searches title, code, subject)
- `grade` (string, optional) - Filter by grade (K, 01-12)
- `category` (string, optional) - Filter by course category
- `language` (string, optional) - Filter by language (English/French)
- `subject` (string, optional) - Filter by ministry subject code
- `credits` (string, optional) - Filter by credit value
- `limit` (integer, default: 20) - Results per page
- `offset` (integer, default: 0) - Pagination offset

**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "course_code": "1609063",
      "course_title": "CORE FRENCH 12",
      "grade": "12",
      "credit_value": "4",
      "course_category": "Ministry",
      "language": "English",
      "hst_main_category": "16 FOREIGN LANGUAGES",
      "hst_sub_category": "09 ITALIC LANGUAGES",
      "ministry_subject_code": "30 Languages",
      "grad_program": "1995 Graduation Program",
      "grad_program_requirement": "Elective"
    }
  ],
  "total": 1234,
  "limit": 20,
  "offset": 0,
  "filters_applied": {
    "grade": "12",
    "language": "English"
  }
}
```

**Search Logic:**
1. If `q` is provided, use full-text search on title, code, and subject
2. Apply all filters (grade, category, language, etc.)
3. Always exclude courses with `close_date` (only show open courses)
4. Order by relevance (if searching) or alphabetically by title
5. Cache popular queries in Vercel KV for 1 hour

**Performance Target:** < 200ms response time

### 2. Get Course Details
**Endpoint:** `GET /api/courses/[code]`

**Path Parameter:**
- `code` (string) - Course code

**Query Parameters:**
- `grade` (string, optional) - Specific grade if course appears in multiple
- `grad_program` (string, optional) - Specific graduation program

**Response:**
```json
{
  "data": {
    "id": 123,
    "course_code": "1609063",
    "myedbc_code": "MFR--12",
    "trax_code": "FR   12",
    "course_title": "CORE FRENCH 12",
    "grade": "12",
    "credit_value": "4",
    "course_category": "Ministry",
    "language": "English",
    "developer": "Ministry of Education and Child Care",
    "authorizer": "Ministry of Education and Child Care",
    "open_date": "1973-01-01",
    "close_date": null,
    "grad_program": "1995 Graduation Program",
    "grad_program_requirement": "Elective",
    "hst_main_category": "16 FOREIGN LANGUAGES",
    "hst_sub_category": "09 ITALIC LANGUAGES",
    "ministry_subject_code": "30 Languages",
    "related_courses": [
      {
        "course_code": "1609073",
        "course_title": "INTENSIVE FRENCH 12",
        "grade": "12"
      }
    ]
  }
}
```

**Logic:**
- If multiple entries exist for same code, return array or filter by grad_program
- Include "related_courses" - same subject code or similar title
- Cache individual course details for 24 hours

### 3. Get Filter Options
**Endpoint:** `GET /api/courses/filters`

**Response:**
```json
{
  "grades": [
    {"value": "K", "label": "Kindergarten", "count": 33},
    {"value": "10", "label": "Grade 10", "count": 922},
    {"value": "11", "label": "Grade 11", "count": 2075},
    {"value": "12", "label": "Grade 12", "count": 9098}
  ],
  "categories": [
    {"value": "Ministry", "label": "Ministry", "count": 2678},
    {"value": "External Credential", "label": "External Credential", "count": 8866}
  ],
  "languages": [
    {"value": "English", "label": "English", "count": 11260},
    {"value": "French", "label": "French", "count": 1481}
  ],
  "subjects": [
    {"value": "30 Languages", "label": "Languages", "count": 456},
    {"value": "40 Mathematics", "label": "Mathematics", "count": 789}
  ]
}
```

**Logic:**
- Pre-compute counts for each filter option
- Cache for 24 hours (only changes when data is re-imported)
- Only return filters for active courses (close_date IS NULL)

### 4. Autocomplete Suggestions
**Endpoint:** `GET /api/courses/suggest`

**Query Parameters:**
- `q` (string, required, min 2 chars) - Partial search query
- `limit` (integer, default: 5) - Number of suggestions

**Response:**
```json
{
  "suggestions": [
    {
      "course_title": "CORE FRENCH 12",
      "course_code": "1609063",
      "grade": "12",
      "match_type": "title"
    },
    {
      "course_title": "INTENSIVE FRENCH 12",
      "course_code": "1609073",
      "grade": "12",
      "match_type": "title"
    }
  ]
}
```

**Logic:**
- Use PostgreSQL trigram similarity for fuzzy matching
- Search across: course_title, course_code, hst_sub_category
- Order by relevance score
- Return top 5 matches
- Cache common prefixes for 1 hour

### 5. Log Search (Analytics)
**Endpoint:** `POST /api/analytics/search`

**Request Body:**
```json
{
  "query": "math grade 11",
  "filters": {
    "grade": "11",
    "category": "Ministry"
  },
  "result_count": 45,
  "clicked_courses": ["2304567", "2304568"]
}
```

**Response:**
```json
{
  "success": true
}
```

**Logic:**
- Fire-and-forget logging (don't block user)
- Anonymous (no user identification)
- Used for improving search relevance
- Helps identify popular searches to pre-cache

### 6. Health Check
**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "total_courses": 12741,
  "last_import": "2025-01-27T00:00:00Z"
}
```

## Data Import Process

### Initial Setup Script
**File:** `scripts/import-courses.js`

**Requirements:**
- Read `open_courses.xlsx` from local file system
- Clean and validate all data
- Handle Excel date formats correctly
- Batch insert in groups of 1000 (Supabase limit)
- Log import statistics to `data_imports` table
- Provide progress output to console

**Data Cleaning Rules:**
1. Trim all string fields
2. Convert course_code to string (was integer in Excel)
3. Convert Excel dates to ISO format (YYYY-MM-DD)
4. Handle null values appropriately (don't insert "NaN" strings)
5. Preserve comma-separated credit values as strings

**Validation Rules:**
- course_code: Required, non-empty
- grade: Required, must match pattern (K, 01-12)
- course_title: Required, non-empty
- course_category: Required, must be one of 4 valid values
- language: Required, must be "English" or "French"
- open_date: Required, must be valid date

**Error Handling:**
- Log all validation errors with row numbers
- Continue processing valid rows even if some fail
- Report summary at end: X successful, Y failed
- Save failed rows to `failed_imports.json` for review

**Usage:**
```bash
# Set environment variables
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_KEY=eyJxxx...

# Run import
node scripts/import-courses.js ./open_courses.xlsx

# Expected output:
# 🚀 Starting BC Course Import...
# ✓ Connected to Supabase
# 📁 Reading Excel file: open_courses.xlsx
# ✓ Found 12,741 rows
# 🧹 Cleaning and validating data...
# ✓ Valid courses: 12,741
# 🗑️  Clearing existing courses...
# 📊 Importing in batches of 1000...
# [1/13] Batch 1: 1000 courses imported
# [2/13] Batch 2: 1000 courses imported
# ...
# ✅ Import complete: 12,741 courses imported
# ⏱️  Total time: 45 seconds
```

### Future Data Updates
**Frequency:** Quarterly (August, November, February, May)

**Process:**
1. Download new Excel file from BC Ministry
2. Run import script with `--clear` flag to wipe old data
3. Verify import success via health endpoint
4. Check courses_by_grade view for sanity check
5. Clear Vercel KV cache (filters and popular searches)

**Script Enhancement (Future):**
- Add `--diff` mode to show what changed
- Add `--dry-run` mode to validate without importing
- Email notification on completion

## Caching Strategy

### Vercel KV (Redis)

**What to Cache:**
1. **Filter options** - Key: `filters:v1`, TTL: 24 hours
2. **Popular searches** - Key: `search:{query}:{filters_hash}`, TTL: 1 hour
3. **Course details** - Key: `course:{code}:{grade}`, TTL: 24 hours
4. **Autocomplete** - Key: `suggest:{prefix}`, TTL: 1 hour

**Cache Invalidation:**
- Manual flush after data import
- Automatic TTL expiry
- No need for real-time invalidation (data changes quarterly)

**Implementation Pattern:**
```javascript
// Check cache first
const cached = await kv.get(cacheKey);
if (cached) return cached;

// Fetch from database
const data = await supabase.from('courses')...;

// Store in cache
await kv.set(cacheKey, data, { ex: 3600 }); // 1 hour

return data;
```

## Performance Requirements

### Response Times (P95)
- `/api/courses/search` - < 200ms
- `/api/courses/[code]` - < 100ms (cached), < 300ms (uncached)
- `/api/courses/filters` - < 50ms (always cached)
- `/api/courses/suggest` - < 150ms

### Database Query Limits
- Max 5 database queries per API request
- Use JOINs instead of multiple queries where possible
- Limit result sets to 100 courses max per query

### Vercel Free Tier Limits
- 100 GB bandwidth/month
- 100 hours serverless execution/month
- Assume average request = 50 KB response = 2M requests/month possible

### Supabase Free Tier Limits
- 500 MB database storage - **Current usage: ~250 MB (plenty of headroom)**
- 2 GB file storage (not used yet)
- 50,000 monthly active users
- 5 GB bandwidth/month

## Error Handling

### API Error Responses
```json
{
  "error": {
    "code": "INVALID_GRADE",
    "message": "Grade must be K or 01-12",
    "details": {
      "provided": "13",
      "valid_values": ["K", "01", "02", ..., "12"]
    }
  }
}
```

### Error Codes
- `INVALID_GRADE` - 400
- `INVALID_CATEGORY` - 400
- `INVALID_LANGUAGE` - 400
- `COURSE_NOT_FOUND` - 404
- `DATABASE_ERROR` - 500
- `RATE_LIMIT_EXCEEDED` - 429

### Logging
- Log all errors to console (Vercel captures)
- Log slow queries (> 1 second) with query details
- Log cache hit/miss rates for optimization

## Security

### Row Level Security (RLS)
```sql
-- Public read access to courses
CREATE POLICY "Public can read courses" ON courses
  FOR SELECT USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can modify" ON courses
  FOR ALL USING (auth.role() = 'service_role');
```

### API Security
- No authentication required for read endpoints (public data)
- Rate limiting: 100 requests/minute per IP (Vercel Edge Config)
- Service role key kept in environment variables (never exposed)
- No SQL injection risk (using Supabase client, not raw SQL)

### CORS
- Allow all origins for API routes (public API)
- Standard headers: `Access-Control-Allow-Origin: *`

## Environment Variables

### Required (Development)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx... # Public key for frontend
SUPABASE_SERVICE_KEY=eyJxxx... # Private key for import script

# Vercel KV (auto-populated by Vercel)
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=xxx
KV_REST_API_READ_ONLY_TOKEN=xxx
```

### Required (Production)
Same as development, but with production Supabase project

## Testing Requirements

### Unit Tests (Jest)
- Data cleaning functions
- Date parsing logic
- Validation rules
- Cache key generation

### Integration Tests
- Import script with sample Excel file
- Each API endpoint with various parameters
- Database query performance
- Cache hit/miss scenarios

### Test Data
- Create `test_courses.xlsx` with 100 sample rows
- Cover edge cases: nulls, special characters, date formats

## Monitoring & Analytics

### Key Metrics
- Total courses in database
- Search queries per day
- Most popular searches (top 20)
- Most viewed courses (top 20)
- Average search response time
- Cache hit rate
- API error rate

### Dashboard Queries
```sql
-- Most popular searches (last 7 days)
SELECT query, COUNT(*) as count
FROM search_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY count DESC
LIMIT 20;

-- Most clicked courses
SELECT 
  unnest(clicked_course_codes) as course_code,
  COUNT(*) as clicks
FROM search_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY course_code
ORDER BY clicks DESC
LIMIT 20;

-- Search response times (from Vercel logs)
-- Average courses per search
SELECT AVG(result_count) FROM search_logs;
```

## Success Criteria

### MVP (Week 1-2)
- [x] Database schema created in Supabase
- [x] Import script successfully loads all 12,741 courses
- [x] Search API returns results in < 200ms
- [x] Filter API returns all options
- [x] Course detail API works

### Week 3-4
- [x] Caching implemented (Vercel KV)
- [x] Autocomplete endpoint working
- [x] Search analytics logging
- [x] All APIs tested with real data

### Week 5-8
- [x] Performance optimized (all endpoints < targets)
- [x] Error handling comprehensive
- [x] Documentation complete
- [x] Ready for frontend integration

## Future Enhancements (Not MVP)

### Phase 2 (After AI Integration)
- Vector embeddings for semantic search (pgvector)
- Related courses algorithm (using embeddings)
- Course prerequisites mapping
- Graduation requirement checker

### Phase 3 (Paid Features)
- User accounts and saved courses
- University program requirements integration
- Scholarship matching
- Course planning tools

## Dependencies

### NPM Packages (for import script)
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "xlsx": "^0.18.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

### External Services
- Supabase (database + storage)
- Vercel (hosting + KV cache)
- BC Ministry of Education (data source)

## Documentation

### For Developers
- `/docs/api.md` - API endpoint documentation
- `/docs/database.md` - Schema documentation
- `/docs/import.md` - Data import guide
- `/docs/deployment.md` - Deployment checklist

### For Users (Future)
- `/docs/data-sources.md` - Where data comes from
- `/docs/privacy.md` - What we track (anonymous only)

## Open Questions
1. Should we deduplicate courses with same code across different grad programs?
   **Decision: No, keep all entries. Frontend can filter/group if needed.**

2. How to handle course updates mid-quarter?
   **Decision: Manual quarterly updates sufficient for MVP.**

3. Should search return courses from all grad programs or just "current"?
   **Decision: Return all, let user filter by grad program if needed.**

4. What to do with courses that have null credit_value?
   **Decision: Store as null, frontend shows "N/A" or hides field.**

---

**Priority:** HIGH
**Timeline:** Week 1-2 for MVP (database + import + basic APIs)
**Owner:** TejasTech
**Dependencies:** Supabase account, Excel file access
**Success Metric:** Can search and retrieve all 12,741 courses via API
