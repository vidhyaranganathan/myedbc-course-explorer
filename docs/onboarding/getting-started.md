# Getting Started

Welcome to BC Course Finder! This guide will get you up and running.

## Prerequisites

- **Node.js** 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- **npm** (comes with Node.js)
- **Python 3** (only needed if you're updating course details data)
- **Git**

## Setup

```bash
# Clone the repo
git clone <repo-url>
cd myedbc-course-explorer

# Install dependencies
npm install

# Enable git hooks (pre-push runs lint + test + build)
git config core.hooksPath .githooks

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project at a Glance

BC Course Finder is a **single-page Next.js app** that lets users search and explore British Columbia's high school (grades 9-12) courses. There is no database and no backend API — all data is loaded client-side from static JSON files that ship with the app.

Key things to know:

- **One page**: The entire UI lives in `src/app/page.tsx`
- **Two data files**: `src/data/courses.json` (~12K rows from BC Ministry Excel) and `src/data/course-details.json` (~5.5K entries scraped from BC Course Registry)
- **Client-side filtering**: All search/filter logic runs in the browser via `src/lib/search.ts`
- **Deduplication**: The raw data has duplicate rows (one per graduation program). The app deduplicates by course code + grade at runtime, reducing ~12K rows to ~5K unique courses

## Common Tasks

### Run the dev server

```bash
npm run dev
```

### Run a production build

```bash
npm run build
```

### Run the linter

```bash
npm run lint
```

### Update course data from Excel

```bash
# Uses default path: ~/Downloads/open_courses (1).xlsx
npm run import

# Or specify a custom path
npm run import -- /path/to/file.xlsx
```

### Scrape course details from BC Course Registry

```bash
python3 scripts/scrape-course-details.py
```

This script is resumable — if interrupted, it picks up where it left off.

## Next Steps

- Read the [Architecture Overview](../architecture/overview.md) to understand how the pieces fit together
- Check the [Decision Records](../decisions/) to understand why things are built this way
- See the [Roadmap](../roadmap/roadmap.md) for what's planned next
