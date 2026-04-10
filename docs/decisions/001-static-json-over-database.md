# ADR-001: Static JSON Over Database

**Status**: Superseded by ADR-006
**Date**: 2025 (project inception)

## Context

The app needs to display ~5K unique BC courses with search and filter capabilities. The source data comes from a Ministry Excel file that is updated periodically (not in real time). We needed to decide how to store and serve this data.

Options considered:

1. **Supabase/Postgres database** (was originally implemented)
2. **Static JSON files shipped with the app**
3. **API-backed with server-side search**

## Decision

Use static JSON files committed to git and loaded client-side.

The project originally started with a Supabase backend and a separate frontend/backend architecture. This was replaced with a single Next.js app loading static JSON.

## Consequences

**Positive:**
- Zero infrastructure cost (no database to maintain)
- Zero latency for searches (all data in browser memory)
- Simple deployment (just a static site on Vercel)
- Data is version-controlled alongside the code
- No API keys, no connection strings, no secrets

**Negative:**
- Initial page load downloads the full dataset (~500KB compressed)
- Data updates require a code commit and deploy
- No real-time collaboration or user-generated content possible
- Would need to revisit if dataset grows significantly (>50K courses)

**Neutral:**
- Deduplication must happen client-side since the raw data is committed as-is

## Amendment (2026-04-10)

This decision was revisited as the project moves toward production. See **ADR-006** for the decision to migrate to Supabase. The static JSON files are retained as the data source for the seed script but will no longer be the primary runtime data layer.
