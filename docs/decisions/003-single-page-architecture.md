# ADR-003: Single-Page Architecture

**Status**: Accepted  
**Date**: 2025

## Context

The app started as a multi-page frontend/backend architecture with separate services. As the project simplified (removing the database, moving to static JSON), we needed to decide whether to keep multiple pages/routes or consolidate.

## Decision

Consolidate to a single page (`src/app/page.tsx`) that handles all search, filtering, and course display.

## Consequences

**Positive:**
- Extremely simple mental model — one file, one page
- No routing complexity
- Fast navigation (no page transitions)
- Easy to understand for new contributors

**Negative:**
- The single page component is large and will grow as features are added
- No deep-linkable URLs for specific searches or courses (yet)
- SEO is limited (single page with dynamic content)

**When to revisit:**
- If we add course detail pages with their own URLs
- If the page component exceeds ~500 lines and becomes hard to navigate
- If we need shareable search URLs
