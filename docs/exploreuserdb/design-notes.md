# User DB Design Exploration

## Auth layer — Supabase Auth

Supabase Auth manages `auth.users` for us (email, hashed password, email verification,
password reset). We create a linked `public.profiles` table for app-specific data.

The relationship: one `auth.users` row → one `profiles` row → many `saved_filter_sets` rows.

---

## Tables

### `public.profiles`

One row per user. Created automatically when a user signs up (via trigger).
Email and password are managed by Supabase Auth in `auth.users` — never stored in `profiles`.

| Column          | Type       | Notes                                      |
|-----------------|------------|--------------------------------------------|
| id              | UUID PK    | References `auth.users(id)`, cascades      |
| role            | TEXT       | 'student' / 'parent' / 'counselor' / 'teacher' |
| grade_interest  | INTEGER[]  | Grades they browse for (10, 11, 12)        |
| school          | TEXT       | e.g. "Burnaby Mountain Secondary"          |
| district        | TEXT       | e.g. "SD41 – Burnaby"                     |
| created_at      | TIMESTAMPTZ| Default now()                              |
| updated_at      | TIMESTAMPTZ| Updated by trigger                         |

`role` is a CHECK constraint (not a foreign key) since the list is short and stable.
`grade_interest` is an array so a parent browsing both grade 10 and 11 can store both.

---

### `public.saved_filter_sets`

Many rows per user — each is a named snapshot of the filter bar state.

| Column      | Type       | Notes                                             |
|-------------|------------|---------------------------------------------------|
| id          | UUID PK    | gen_random_uuid()                                 |
| user_id     | UUID FK    | References `auth.users(id)`, cascades             |
| name        | TEXT       | User-given name, e.g. "Grade 11 Science French"   |
| is_default  | BOOLEAN    | True for the one set loaded on page open          |
| filters     | JSONB      | Full filter state (see shape below)               |
| share_token | TEXT       | NULL = private; non-null = shareable via link     |
| created_at  | TIMESTAMPTZ|                                                   |
| updated_at  | TIMESTAMPTZ|                                                   |

**`filters` JSONB shape** (matches the current app's filter state):
```json
{
  "grades":      ["11", "12"],
  "languages":   ["English"],
  "categories":  ["Elective"],
  "subjects":    ["Science", "Mathematics"],
  "searchTerm":  "physics"
}
```

All fields are optional arrays/strings — an empty array means "no filter on this dimension".
Using JSONB means adding a new filter dimension (e.g. `credits`) doesn't require a schema change.

---

## Constraints and integrity

### Only one default per user
A unique partial index at the DB level:
```sql
CREATE UNIQUE INDEX one_default_per_user
  ON saved_filter_sets (user_id)
  WHERE is_default = true;
```
This means the DB rejects a second `is_default = true` for the same user — the application
layer must set the old default to false before setting a new one (within a transaction).

### Auto-create profile on signup
A Postgres trigger on `auth.users` INSERT creates the `profiles` row so the app never
has to do it manually:
```sql
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### `updated_at` auto-refresh
A single trigger function handles both tables:
```sql
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
```

---

## Row Level Security (RLS) and data protection

RLS is already enabled on `courses` — same pattern here. Since users are students, protection is strict:
- A student can only read and write their own `profiles` row
- A student can only read and write their own `saved_filter_sets` rows
- No cross-user reads — no student can see another student's profile or filter sets
- All DB access goes through server-side API routes (service role key) — the anon key never touches profile data directly

### profiles
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Students can only read/write their own row
CREATE POLICY "own profile" ON public.profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### saved_filter_sets
```sql
ALTER TABLE public.saved_filter_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own filter sets" ON public.saved_filter_sets
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Sharing and importing filter sets

Users can share a named filter set via a link. The recipient gets an independent copy — no live link between the two after import.

| Step | How |
|---|---|
| Share | User clicks "Share" → `share_token` generated and stored on the row |
| Link | `bccourses.ca/filters/share/<token>` |
| Preview | Anyone with the link can view name + filters — no account needed |
| Import | Recipient clicks "Add to my filters" → logs in → independent copy saved to their account |
| Revoke | Sharer sets `share_token` back to NULL |

API routes:
- `PATCH /api/filters/[id]/share` — generates and stores the token (authenticated)
- `GET /api/filters/share/[token]` — returns name + filters by token, no auth required (server-side service role)
- `POST /api/filters` — saves a copy to the current user's account (authenticated)

---

## Encryption

No application-level encryption needed at this stage. Coverage by layer:

| Layer | What covers it |
|---|---|
| Passwords | Supabase Auth — bcrypt-hashed, never stored in plaintext |
| Data in transit | TLS enforced by Supabase and Vercel (HTTPS) |
| Data at rest | Supabase encrypts storage at infrastructure level (AES-256) |
| Access control | RLS + API gateway — the primary practical protection for student data |

The most sensitive fields in the schema are `school` and `district` — not data that warrants column-level encryption. For BC's PIPA (which covers minors), the requirements are about appropriate access controls and consent, not column-level encryption. RLS policies and the API gateway already address that.

Column-level encryption (e.g. `pgcrypto`) becomes relevant if the app ever stores health records, financial data, or government IDs. Not applicable here.

Note: Supabase encrypts at the storage level, but a project admin can still read rows in the dashboard. If that becomes a concern, revisit column encryption at that time.

---

## Key design decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Auth provider | Supabase Auth | Already using Supabase; email + password, email verification, and password reset all built in |
| Email and password storage | `auth.users` only | Never stored in `profiles` — Supabase Auth owns identity |
| Profile linkage | FK to `auth.users` | Cascade delete — removing auth account removes profile |
| Filter storage | JSONB | Filter shape evolves; no migration needed to add dimensions |
| Default filter | Partial unique index | DB enforces one-default-per-user; no application-level bugs possible |
| `grade_interest` type | `INTEGER[]` | Parents/counselors browse multiple grade levels |
| Service role in app | Unchanged | API gateway pattern stays; only route handlers touch DB |
| Cross-user data visibility | None | No role grants access to another user's data; student controls their own |
| Roles in app | Student-focused for now | Schema is role-aware (`role` column kept) but app only serves students until course planning (R-004) ships |
| Filter sharing | Copy-on-import via `share_token` | No live dependencies between users; recipient owns their copy independently |
| Counselor/parent access model | Deferred | No course plan data exists yet; revisit when R-004 is on deck |
| Encryption | Supabase built-ins only | Passwords bcrypt-hashed by Auth; TLS in transit; AES-256 at rest — no column-level encryption needed for this data |

---

## Open questions to decide before implementing

1. ~~**Username uniqueness**~~ — Decided: no username field. Email is the identity, managed by Supabase Auth in `auth.users`.

2. **How many saved sets per user?** No limit by default — add a CHECK or application guard if needed.

3. ~~**Filter set sharing**~~ — Decided: share via `share_token` on `saved_filter_sets`; copy-on-import model; public preview requires no account.

4. **Auth in the Next.js app**: Supabase Auth requires `@supabase/ssr` (or `@supabase/auth-helpers-nextjs`)
   for cookie-based sessions in Next.js App Router. The existing `supabase-server.ts` uses
   the service role key — a separate *anon key* client is needed for auth flows.
   This means adding `SUPABASE_ANON_KEY` as a new env var (currently not in use per CLAUDE.md).

5. **Share link expiry**: Should `share_token` links expire, or be permanent until revoked?
   → Leaning permanent-until-revoked (simpler, more useful for counselors sharing with a class).

6. **Counselor/parent access to student data**: Deferred until course planning (R-004) ships.
   When revisited: use an explicit consent grant table (`plan_access_grants`) — not role-based school-scoped access.
