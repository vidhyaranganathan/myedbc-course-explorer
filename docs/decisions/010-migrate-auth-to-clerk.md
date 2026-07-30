# ADR-010: Migrate Auth from Supabase Auth to Clerk

**Status**: Accepted
**Date**: 2026-07-30

## Context

User auth (PRs #14–#16) currently runs on Supabase Auth: `@supabase/ssr`, cookie-based sessions, email+password only. `docs/onboarding/auth-provider-tradeoffs.md` (2026-07-23, branch `docs/auth-provider-tradeoffs`) evaluated Supabase Auth + SMTP vs. Clerk vs. Auth0 in response to hitting Supabase's built-in email rate limit (TD-019), and recommended staying on Supabase Auth + SMTP — that was a config fix, not a limitation of the auth mechanism itself. That analysis named Clerk as the stronger third-party option "if migration is ever justified on its own merits," and explicitly listed features Supabase Auth doesn't offer as a valid trigger to revisit.

The product now needs social login (Google/etc.) in addition to email+password. Supabase Auth supports OAuth providers too, but Clerk was already scoped as the better fit if a migration were to happen — prebuilt UI with social buttons out of the box, first-party Supabase JWT integration, cheaper free tier (10k MAU vs. Supabase's 50k, but Supabase's ceiling was never the actual constraint). This is that migration.

## Decision

Replace Supabase Auth with Clerk for identity. Postgres stays on Supabase, accessed only via the service-role key (`src/lib/supabase-server.ts`) — this is an identity-layer swap, not a data-layer change.

- **UI**: Clerk's prebuilt `<SignIn>`/`<SignUp>` components (catch-all routes at `/login/[[...rest]]`, `/signup/[[...rest]]`), themed via Clerk's `appearance` prop. Social providers are enabled in the Clerk Dashboard with no bespoke OAuth code.
- **Session/middleware**: `clerkMiddleware()` in `src/proxy.ts` replaces the manual `@supabase/ssr` cookie-refresh logic, preserving the same route-protection behavior (`/profile` redirects to `/login`; `/api/user/*` returns 401 JSON).
- **Server-side session read**: `src/lib/auth.ts` (renamed from `supabase-auth.ts`) exposes `getSessionUser()` backed by Clerk's `currentUser()`, same `{ userId, email } | null` shape as before — every `/api/user/*` route and `profile/page.tsx` only change their import, not their logic.
- **Schema**: `profiles.id` and `saved_filter_sets.user_id` change from `UUID REFERENCES auth.users(id)` to plain `TEXT` (Clerk ids are strings like `user_2abc...`, and there is no `auth.users` table to reference once Clerk owns identity). The `handle_new_user()` trigger on `auth.users` insert is dropped — there's no equivalent Postgres-level signup hook under Clerk.
- **Profile bootstrap**: no Clerk webhook. The existing self-healing upsert in `PATCH /api/user/profile` (previously a fallback for a trigger-created row) becomes the only creation path — a profile row is created lazily on first save. Simpler, and sufficient since there's no feature today that requires a profile row to exist before first edit.
- **RLS**: `profiles`/`saved_filter_sets` RLS policies keyed on `auth.uid()` are left in place, unchanged. They were already inert for the app's own access — every route handler uses the service-role client, which bypasses RLS, and `user_id` scoping in the route handler was always the real enforcement (see `docs/exploreuserdb/`). After this migration nothing ever authenticates as a Supabase session at all, so these policies become fully decorative defense-in-depth against the now-unused anon key rather than an active boundary. Not worth the schema churn to remove.

## Consequences

**Positive:**
- Social login (Google, etc.) with no custom OAuth redirect handling — Clerk's prebuilt components handle it
- Deletes a meaningful amount of hand-rolled auth code: `auth/actions.ts`, `auth/callback/route.ts`, `/api/auth/logout`, the custom login/signup form markup
- Clerk's free tier (10k MAU) is sufficient at current scale and compatible with Vercel Hobby (no infra beyond env vars + a dashboard config step, same shape as the earlier Supabase SMTP setup)
- Removes `@supabase/ssr` and `SUPABASE_ANON_KEY` entirely — Postgres access was already 100% service-role; nothing else used the anon key

**Negative:**
- New vendor trust boundary (Clerk) in addition to Supabase (now Postgres-only)
- `profiles.id` / `saved_filter_sets.user_id` are no longer FK-constrained to anything — an orphaned-row cleanup on user deletion has no DB-level cascade and needs a `user.deleted` webhook once account deletion becomes a real feature (tracked as tech debt, not built now — no such feature exists today)
- RLS on the user tables is now permanently decorative rather than load-bearing; a future contributor reading `scripts/user-schema.sql` cold could mistake it for active enforcement without this ADR

**When to revisit:**
- If account deletion becomes a feature — build the `user.deleted` webhook before shipping it, to avoid orphaned `profiles`/`saved_filter_sets` rows
- If Clerk's 10k MAU free tier is approached — evaluate Clerk Pro pricing at that point
- If Clerk needs to be replaced — re-run the same tradeoffs framework as `docs/onboarding/auth-provider-tradeoffs.md`, this time scoping the reverse migration
