# CLAUDE.md

This file provides guidance for Claude when working with this repository.

## Project Overview

BC Course Finder - A web application to search and explore British Columbia's 12,741 courses. Helps students, parents, and educators find courses by grade, category, subject, and more.

## Project Structure

```
myedbc-course-explorer/
├── frontend/          # Next.js 16 frontend (React, Tailwind CSS)
│   ├── src/app/       # App router pages
│   └── package.json   # Runs on port 3000
├── backend/           # Next.js 14 API backend
│   ├── src/app/api/   # API routes
│   ├── scripts/       # Import scripts
│   ├── supabase/      # SQL migrations
│   └── package.json   # Runs on port 3001
└── CLAUDE.md
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js 14, TypeScript, Zod validation
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Common Commands

### Frontend (port 3000)
```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
```

### Backend (port 3001)
```bash
cd backend
npm run dev      # Start dev server
npm run build    # Production build
npm run import   # Import courses from Excel
npm run lint     # Run ESLint
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check, returns course count |
| `/api/courses/search` | GET | Search courses with filters (q, grade, category, language, subject, credits, limit, offset) |
| `/api/courses/filters` | GET | Get filter options with counts |
| `/api/courses/suggest` | GET | Autocomplete suggestions (q, limit) |
| `/api/courses/[code]` | GET | Get course by code |
| `/api/analytics/search` | POST | Log search analytics |

## Database

- **Tables**: `courses`, `data_imports`, `search_logs`
- **Migrations**: Located in `backend/supabase/migrations/`
- **Data**: 12,741 courses imported from `backend/data/open_courses.xlsx`

### Course Data Columns
- code, grade, course_title, credit_value, category, language
- myedbc_code, trax_code, developer, authorizer
- open_date, close_date, grad_program, grad_program_requirement
- hst_main_category, hst_sub_category, ministry_subject_code

## Environment Variables

### Backend (.env or Vercel)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...  # Only for import script
```

### Frontend (.env.local or Vercel)
```
NEXT_PUBLIC_API_URL=http://localhost:3001  # Development
NEXT_PUBLIC_API_URL=https://your-api.vercel.app  # Production
```

## Development Notes

- Backend uses lazy initialization for Supabase client to support builds without env vars
- Same course code can appear multiple times (different graduation programs)
- Excel data file is gitignored - obtain from BC Ministry of Education
- CORS is configured in `backend/next.config.mjs` for cross-origin API access

## Deployment

### Quick Deploy
```bash
./deploy.sh  # Interactive deployment script
```

### Architecture
- **Backend**: Separate Vercel project (API server)
- **Frontend**: Separate Vercel project (Web app)
- Frontend connects to backend via `NEXT_PUBLIC_API_URL`

### Deployment Order
1. Deploy backend first
2. Note the backend URL
3. Deploy frontend with backend URL in environment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Code Conventions

- Use TypeScript strict mode
- Validate API inputs with Zod schemas (`backend/src/lib/validation.ts`)
- Handle errors via helpers in `backend/src/lib/errors.ts`
- Database types defined in `backend/src/types/database.ts`
