# Tech Stack

## Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | Framework (used primarily as a static site host) |
| React | 19 | UI rendering |
| TypeScript | 6 | Type safety |
| Tailwind CSS | 4 | Styling |

## Data / Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | — | Postgres database, client SDK |
| @supabase/supabase-js | 2 | Supabase client (seed script + future app queries) |
| dotenv | 17 | Load `.env.local` in Node scripts |

## Dev / Build

| Technology | Purpose |
|------------|---------|
| ESLint | Linting |
| Vitest | Unit and component tests |
| React Testing Library | Component test utilities |
| tsx | Running TypeScript scripts (Excel conversion, DB seed) |
| xlsx | Parsing Excel files (devDependency only) |
| Python 3 | Course details scraper |

## Deployment

| Service | Purpose |
|---------|---------|
| Vercel | Hosting, CDN, deployments |
| Supabase | Hosted Postgres (Hobby/free tier) |
| Git/GitHub | Version control |

## Notable Choices

- **No CSS-in-JS**: Tailwind handles all styling with utility classes
- **No state management library**: React's `useState` + `useMemo` is sufficient
- **Vitest + React Testing Library**: 41 tests at ~77% coverage
- **xlsx in devDependencies**: Has known vulnerabilities but is only used in the local import script, never shipped to production
- **Supabase over plain Postgres**: Managed hosting, free tier, built-in JS client, compatible with Vercel Hobby
