# ADR-005: Filter to Grades 9-12 Only

**Status**: Accepted  
**Date**: 2025

## Context

The source data contains courses for all grades K-12. The app needed a scope decision.

## Decision

Filter to grades 9-12 (high school) only in the UI. The source `courses.json` still contains all grades, but the client filters to the `HIGH_SCHOOL_GRADES` set ("09", "10", "11", "12") before displaying.

## Consequences

**Positive:**
- Focused, relevant dataset for the primary use case (high school course planning)
- Smaller working set means faster filtering
- Simpler UI (no need to handle elementary/middle school course structures)

**Negative:**
- K-8 course data is present in the JSON but invisible to users
- If K-8 support is needed later, the data is already there but the UI would need changes

**When to revisit:**
- If there's demand for K-8 course exploration
- Could be implemented as a toggle or separate view
