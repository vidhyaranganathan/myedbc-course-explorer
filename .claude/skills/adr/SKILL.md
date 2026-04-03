---
name: adr
description: >
  Auto-trigger when conversation contains decision patterns: choosing between alternatives
  ("should we use X or Y", "let's go with", "we decided to", "the tradeoff is", "instead of"),
  architectural changes ("switch to", "replace X with", "add a new", "remove the", "migrate from"),
  or rejecting approaches ("we're not going to", "that won't work because", "too complex").
  Also trigger when the user asks "why" about an existing decision that isn't documented.
  Creates Architecture Decision Records in docs/decisions/.
---

Create a new Architecture Decision Record (ADR) for this project.

The user's decision topic: $ARGUMENTS

## When to auto-trigger

Invoke this skill when you detect ANY of these patterns in conversation, even if the user didn't ask for an ADR:

**Decision language:**
- "should we use X or Y", "let's go with X", "we decided to", "I think we should"
- "the tradeoff is", "pros and cons", "alternatives are"
- "instead of X, let's do Y", "X over Y because"

**Architectural changes:**
- "switch to", "replace X with Y", "migrate from", "move to"
- "add a new [database/service/framework/pattern]"
- "remove the", "drop support for", "deprecate"
- "refactor X to", "restructure"

**Rejecting approaches:**
- "we're not going to", "that won't work because", "too complex/expensive"
- "tried X but", "X doesn't scale"

**Missing documentation:**
- User asks "why do we..." or "why did we..." about something not covered by an existing ADR
- User questions an existing pattern that has no recorded rationale

## Behaviour

When you detect a decision pattern:

1. **Don't silently create the ADR.** Instead, say something like: "That sounds like an architectural decision worth capturing. Let me draft an ADR for it."
2. Look at existing ADR files in `docs/decisions/` to determine the next number
3. Read the template at `docs/decisions/template.md` for the format
4. If there's enough context from the conversation, draft the full ADR immediately and ask the user to review
5. If context is thin, ask 1-2 focused questions (not a full interview):
   - What alternatives were considered?
   - What's the main downside of this choice?
6. Create the ADR file at `docs/decisions/NNN-kebab-case-title.md` with:
   - The next sequential number (zero-padded to 3 digits)
   - Status set to "Accepted" (or "Proposed" if still deciding)
   - Today's date
   - Filled-in Context, Decision, and Consequences sections

## Before creating

- Check existing ADRs for duplicates — if a similar decision is already recorded, update it instead of creating a new one
- Don't create ADRs for trivial choices (variable names, minor formatting, which test assertion to use)
- Focus on decisions that a new contributor would ask "why?" about

Keep the writing concise and factual. Focus on the "why" — the code shows "what", the ADR explains "why".
