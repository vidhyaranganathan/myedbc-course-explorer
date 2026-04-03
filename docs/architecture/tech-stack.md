# Tech Stack

## Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | Framework (used primarily as a static site host) |
| React | 19 | UI rendering |
| TypeScript | 6 | Type safety |
| Tailwind CSS | 4 | Styling |

## Dev / Build

| Technology | Purpose |
|------------|---------|
| ESLint | Linting |
| tsx | Running TypeScript scripts (Excel conversion) |
| xlsx | Parsing Excel files (devDependency only) |
| Python 3 | Course details scraper |

## Deployment

| Service | Purpose |
|---------|---------|
| Vercel | Hosting, CDN, deployments |
| Git/GitHub | Version control |

## Notable Choices

- **No CSS-in-JS**: Tailwind handles all styling with utility classes
- **No state management library**: React's `useState` + `useMemo` is sufficient
- **No testing framework yet**: The app is simple enough that manual testing has been sufficient so far
- **xlsx in devDependencies**: Has known vulnerabilities but is only used in the local import script, never shipped to production
