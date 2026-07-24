# Auth Provider Tradeoffs: Supabase Auth vs. Clerk vs. Auth0

**Date**: 2026-07-23

## Context

Manual testing of the forgot-password flow on `fix/default-filter-race-and-auth-improvements`
hit Supabase Auth's built-in email service rate limit after ~2 emails. That
service is documented as testing-only, with a low, fixed, project-wide limit
shared across all auth emails (signup confirmation, password reset, magic
link). In production this would silently fail signups/resets for real users
past the first couple per window (tracked as TD-019; see
`docs/onboarding/production-email-readiness.md`).

This prompted an evaluation of three options: fix email delivery on the
current setup, or replace Supabase Auth entirely with a third-party identity
provider (Clerk or Auth0).

## Option 1: Keep Supabase Auth, add custom SMTP

Sign up with an SMTP provider (e.g. Resend, free to 3k emails/mo), verify a
custom domain, configure it in Supabase Dashboard → Authentication → Email →
SMTP Settings. No code changes.

## Option 2: Migrate to Clerk

Third-party identity provider; Postgres stays on Supabase.

## Option 3: Migrate to Auth0

Same shape as Clerk, different vendor.

## Comparison

### Cost

| | Supabase Auth + SMTP | Clerk | Auth0 |
|---|---|---|---|
| Ongoing | $0 extra beyond SMTP: Resend free tier + ~$12/yr domain | Free to 10k MAU; ~$25/mo+ beyond | Free to ~7.5k MAU; ~$35/mo+ beyond, priciest at scale |
| One-time | None — SMTP config only | Substantial migration engineering (see below) | Same migration cost as Clerk |

### Scalability (free tier)

- **Supabase Auth**: 50k MAU free. The real constraint was never MAU — it's
  the built-in email sender's throughput (a few emails/hour), which SMTP
  fixes independently of any MAU tier.
- **Clerk**: 10k MAU free, no feature gating at that tier.
- **Auth0**: ~7.5k MAU free, lowest ceiling of the three, with some features
  gated even under that cap.

### Security

- **Supabase Auth**: mature (GoTrue), RLS + `auth.uid()` native, no trust
  boundary to reconfigure. The only current gap is the email-delivery path
  for account recovery — closed by SMTP, not a change to the auth mechanism.
- **Clerk**: strong built-in features (breach-password detection, MFA,
  session revocation) and a first-party Supabase JWT integration, but adds a
  new vendor trust boundary and requires a `user.deleted` webhook to avoid
  orphaning `profiles`/`saved_filter_sets` rows — a failure mode that doesn't
  exist today.
- **Auth0**: same third-party trust-boundary and webhook-cascade requirement
  as Clerk, but JWKS/issuer setup is manual (no dedicated Supabase
  integration), so more room for misconfiguration. Offers enterprise
  compliance certifications (SOC2/HIPAA) not currently needed.

### Migration cost (Clerk, as the stronger of the two third-party options)

Scoped by reading the current wiring (`src/lib/supabase-auth.ts`,
`src/proxy.ts`, `src/app/auth/`, `src/app/api/auth/`, `src/app/api/user/*`,
`scripts/user-schema.sql`):

- Straightforward swap: `supabase-auth.ts`, `proxy.ts`, `/api/auth/me`,
  `/api/auth/logout`, `Header.tsx` — all just call Clerk's `auth()`/
  `currentUser()` instead of Supabase's `.auth.getUser()`.
- Architectural, not drop-in: `src/app/auth/actions.ts` drives login/signup/
  reset through server actions calling `signInWithPassword`/`signUp`/
  `resetPasswordForEmail`/`updateUser`. Clerk expects client-side flows
  (`<SignIn>`/`<SignUp>` or `signIn.create()`/`signUp.create()`), so the
  login, signup, forgot-password, and reset-password pages would need
  rewriting, not just their handler bodies.
- Schema: `profiles.id` and `saved_filter_sets.user_id` are `UUID` FKs to
  `auth.users(id) ON DELETE CASCADE`. Clerk ids are strings
  (`user_2abc...`), not UUIDs — both columns would need to become `TEXT`,
  the FK to `auth.users` dropped, and the `handle_new_user()` signup trigger
  replaced by a Clerk webhook (or by promoting the existing "self-healing"
  upsert in `PATCH /api/user/profile` from fallback to primary path).
- RLS policies keyed on `auth.uid()` go inert either way — per
  `docs/exploreuserdb/user-db-design-notes.md`, RLS here was always
  defense-in-depth; the route handler's manual `user_id` scoping is the real
  enforcement, so this isn't a security regression.
- Net size: bigger than any single one of PRs #14–#16 individually — it
  touches pieces of all three. Auth0 would carry the same scope of change.

## Recommendation

Fix email delivery on the current setup (Option 1) rather than migrating.
The rate limit is a configuration gap in the email-sending path, not a
limitation of Supabase Auth or its free-tier MAU ceiling — on every axis
compared here (cost, scalability, security), it wins or ties, and it's the
only option with no code changes and no risk to the work already merged in
PRs #14–#16.

Between the two third-party options, Clerk is the better fit if a migration
is ever justified on its own merits (prebuilt auth UI, MFA, org/team
accounts) — cheaper at the free tier, and a first-party Supabase integration
versus Auth0's manual JWKS setup. Revisit this if MAU approaches Supabase's
50k free-tier ceiling, or if the app needs features Supabase Auth doesn't
offer (MFA, org/team accounts, SOC2/HIPAA compliance).
