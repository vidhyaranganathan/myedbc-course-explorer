# User DB Schema Summary

## `public.profiles`
One row per user, auto-created on signup. Email and password are managed by Supabase Auth in `auth.users` — they are not stored here.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, references `auth.users(id)`, cascades on delete |
| role | TEXT | `student` / `parent` / `counselor` / `teacher` |
| grade_interest | INTEGER[] | Grades they browse for: 10, 11, 12 |
| school | TEXT | e.g. "Burnaby Mountain Secondary" |
| district | TEXT | e.g. "SD41 – Burnaby" |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Auto-updated by trigger |

> **Email and password**: handled entirely by Supabase Auth. Sign-up, login, email verification, and password reset all go through Supabase Auth — no password is ever stored in `profiles`.

---

## `public.saved_filter_sets`
Named snapshots of the filter bar. Many rows per user.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, auto-generated |
| user_id | UUID | References `auth.users(id)`, cascades on delete |
| name | TEXT | User-given name, e.g. "Grade 11 Science French" |
| is_default | BOOLEAN | One default per user (enforced by partial unique index) |
| filters | JSONB | Full filter state: grades, languages, categories, subjects, searchTerm |
| share_token | TEXT | NULL = private; non-null = shareable via link |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Auto-updated by trigger |

---

## Sharing and importing

| Step | How |
|---|---|
| Share | User clicks "Share" → `share_token` generated and stored |
| Link | `bccourses.ca/filters/share/<token>` |
| Preview | Anyone with the link can view name + filters — no account needed |
| Import | Recipient clicks "Add to my filters" → logs in → independent copy saved to their account |
| Revoke | Sharer sets `share_token` back to NULL |

---

## Key constraints

- `role` is a CHECK constraint (not a FK) — list is short and stable
- `grade_interest` is an array so users browsing multiple grades can store all of them
- Exactly one default filter set per user enforced by a partial unique index on `(user_id) WHERE is_default = true`
- `share_token` is globally unique — tokens cannot collide across users
- Both tables have RLS enabled; users read/write only their own rows — no student can see another student's profile or filter sets
- Auth is handled by Supabase Auth (`auth.users`); a trigger auto-creates the `profiles` row on signup
- All DB access goes through server-side API routes (service role key) — the anon key is never used to read profile data directly
