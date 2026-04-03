# BC Course Finder

Search and explore British Columbia's high school courses. Helps students, parents, and educators find courses by grade, category, subject, language, and credits.

**Live**: Deployed on Vercel (Hobby)

## Quick Start

```bash
git clone git@github.com:vidhyaranganathan/myedbc-course-explorer.git
cd myedbc-course-explorer
npm install
git config core.hooksPath .githooks   # enables pre-push checks
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

All course data is stored as static JSON files that ship with the app. When the page loads, ~5,000 deduplicated courses are available in the browser — search and filtering happen instantly with zero network requests.

The data comes from two sources:
- **BC Ministry of Education** Excel file → `src/data/courses.json` (12,741 rows, deduplicated to ~5K at runtime)
- **BC Course Registry** website → `src/data/course-details.json` (5,480 course descriptions)

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | Framework |
| React | 19 | UI |
| TypeScript | 6 | Type safety |
| Tailwind CSS | 4 | Styling |
| Vitest | 4 | Testing |
| Vercel | Hobby | Deployment |

## Scripts

```bash
npm run dev            # Start dev server (port 3000)
npm run build          # Production build
npm run lint           # Run ESLint
npm run test           # Run tests
npm run test:coverage  # Run tests with coverage report
npm run import         # Convert Excel → courses.json
```

## Updating Course Data

When you get a new Excel file from the BC Ministry of Education:

```bash
npm run import                              # reads from ~/Downloads/open_courses (1).xlsx
npm run import -- /path/to/new-file.xlsx    # or specify a custom path
python3 scripts/scrape-course-details.py    # scrape course descriptions (resumable)
```

Commit both JSON files and redeploy.

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Single-page app (search, filters, course list)
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Tailwind + animations
│   └── api/import/       # Dev-only Excel upload endpoint
├── lib/
│   ├── search.ts         # Client-side filtering engine
│   └── types.ts          # Course type definitions
└── data/
    ├── courses.json      # Generated from Excel
    └── course-details.json  # Scraped from BC Course Registry

docs/
├── onboarding/           # Getting started, data pipeline
├── architecture/         # System overview, tech stack
├── decisions/            # Architecture Decision Records (ADRs)
└── roadmap/              # Feature roadmap, tech debt

scripts/
├── convert-excel.ts      # Excel → JSON conversion
└── scrape-course-details.py  # Course details scraper
```

## Documentation

See the [`docs/`](docs/) folder for:
- [Getting Started](docs/onboarding/getting-started.md) — setup and common tasks
- [Architecture Overview](docs/architecture/overview.md) — how the pieces fit together
- [Decision Records](docs/decisions/) — why things are built this way
- [Roadmap](docs/roadmap/roadmap.md) — what's planned next

## Contributing

1. Create a branch from `main`
2. Make your changes
3. The pre-push hook runs lint + test + build automatically
4. CI runs the same checks on your PR
5. For architectural changes, write a [Decision Record](docs/decisions/template.md) first

## License

See [LICENSE](LICENSE) for details.
