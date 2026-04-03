# Roadmap

## Current State

BC Course Finder is a functional single-page app with search and filtering across ~5K BC high school courses. Data is static JSON, deployed on Vercel.

## Planned / Potential Improvements

### Near-Term

- [ ] **URL-based search state** — Encode filters in URL query params so searches are shareable and bookmarkable
- [ ] **Component extraction** — Break `page.tsx` into smaller components (FilterBar, CourseCard, CourseDetail, etc.)
- [ ] **Testing** — Add unit tests for `search.ts` and component tests for key UI interactions
- [ ] **Accessibility audit** — Ensure keyboard navigation, screen reader support, ARIA labels

### Medium-Term

- [ ] **Course comparison** — Select multiple courses to compare side-by-side
- [ ] **Graduation planning** — Help students see which courses satisfy grad requirements
- [ ] **Improved search** — Fuzzy matching, search highlighting, relevance ranking
- [ ] **Mobile optimization** — Responsive design improvements for smaller screens

### Long-Term / Exploratory

- [ ] **K-8 course support** — Data is already in the JSON, UI would need a toggle or separate view
- [ ] **Course recommendations** — Suggest related courses based on subject area or prerequisites
- [ ] **Data freshness automation** — Automate the Excel import + scrape pipeline (e.g., GitHub Actions)
- [ ] **PWA support** — Offline access for users with intermittent connectivity

## Contributing to the Roadmap

If you'd like to propose a new feature or priority change, open an issue or discuss with the team. For architectural changes, please write a [Decision Record](../decisions/) first.
