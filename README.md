# BC Course Finder

Search and explore British Columbia's 12,741 courses. Helps students, parents, and educators find courses by grade, category, subject, language, and credits.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Updating Course Data

When you get a new Excel file from the BC Ministry of Education:

```bash
npm run import                              # reads from ~/Downloads/open_courses (1).xlsx
npm run import -- /path/to/new-file.xlsx    # or specify a custom path
```

This regenerates `src/data/courses.json`. Commit and redeploy.

## Tech Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4
- Client-side search (all 12,741 courses loaded in-browser)
- Deployed on Vercel

## How It Works

All course data is stored as a static JSON file that ships with the app. When the page loads, the full dataset is available in the browser — search and filtering happen instantly with zero network requests.

## License

See [LICENSE](LICENSE) for details.
