# Demo Account — Feature Spec

Source: user decision (replaces the single shared demo account in [project-overview.md](../project-overview.md) §3 Account & Tools). Related: [auth-spec.md](auth-spec.md).

## Summary

A **Try demo** button creates a fresh, temporary Clerk user with a seeded project. Each visitor gets their own private demo (never shared). Demo data is deleted after 12 hours. Limited to 5 new demos per IP address in a rolling 24 hours. A returning visitor resumes their live demo instead of creating a new one.

## Requirements
- **Try demo** button on the landing page (and optionally the sign-in/register pages).
- On press (server action or route handler):
  1. **Resume check:** if the visitor already has a live demo (still signed in as a demo user, or holding a valid demo cookie), sign them back in and redirect to `/projects`. This does **not** count against the rate limit.
  2. Otherwise check the rate limit for the caller's IP; reject if over 5 new demos in the last rolling 24 hours.
  3. Create a Clerk user via the Clerk Backend API (generated unique email/username, no real credentials).
  4. Create the `User` row (`isDemo = true`, `demoExpiresAt = now + 12h`).
  5. Seed a project: parts, chapters, scenes, plot lines, plot points, characters, places.
  6. Sign the visitor in as that user (Clerk sign-in token / ticket), set the resume cookie, and redirect to `/projects`.
- Each new demo is a brand-new user and project; nothing is shared between visitors.
- Resume cookie: httpOnly, secure, signed, holds the demo user's `clerkId`, expires with the demo. Used to re-mint a sign-in token if the Clerk session lapsed within the 12 hours. If the demo has already expired, the cookie is ignored and cleared and a new demo is created (subject to the limit).
- A visible banner for demo users: "Demo — your data is deleted in X hours. Register to keep your work" linking to `/register`.
- **Demos cannot be converted to real accounts.** Demo data is never migrated. Visitors who want persistence register or sign in normally and start fresh.
- **Expiry:** after 12 hours, delete the Clerk user and the DB `User` (projects cascade) and any UploadThing files.
- Uploads (covers, research files) are disabled or size-capped for demo users.

## Rate limiting (Upstash)
- Use **Upstash Redis** with `@upstash/ratelimit` and the **sliding window** algorithm: 5 requests per `24 h`.
- Key: hash of the client IP (from trusted proxy headers, e.g. `x-forwarded-for`); the raw IP is never stored.
- Only consumed when a new demo is actually created (not on resume). Check with `getRemaining`/`limit` at the point of creation so resumes and failures do not burn quota unnecessarily; refund or skip the count if creation fails.
- On rejection return HTTP 429 with a clear message and the time until the next slot (`reset`).
- **Fail closed:** if Upstash is unreachable or errors, block new demo creation (HTTP 503, "Demos are temporarily unavailable, please try again shortly") rather than creating a demo unchecked. This protects the Clerk user quota. Resuming an existing live demo does not need Upstash and still works.

## Data (proposed — needs a migration via `prisma migrate dev`)
- `User.isDemo` (exists) and new `User.demoExpiresAt DateTime?` with an index.
- No rate-limit table; state lives in Upstash.

## Cleanup job
- Scheduled job (e.g. Vercel Cron hitting a protected route, or a Neon function) runs at least hourly.
- Finds users where `isDemo` and `demoExpiresAt < now`, deletes the Clerk user, then the DB user, in batches.
- Protected by a secret (`CRON_SECRET`); not callable by the public.

## Routes
- `POST /api/demo` (or a server action) — create or resume demo.
- `GET /api/cron/cleanup-demos` — expiry job.

## Env vars
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `CRON_SECRET`
- `DEMO_COOKIE_SECRET` (signs the resume cookie)
- Remove `DEMO_USER_CLERK_ID` (no longer used).

## Interaction with Clerk webhook
- `user.created` fires for demo users too. The webhook must not create a duplicate `User`; use upsert by `clerkId`.
- `user.deleted` fired by the cleanup job must be a no-op if the DB user is already gone.

## Acceptance criteria
- Two different visitors pressing Try demo get two separate users and projects; edits in one never appear in the other.
- The 6th new-demo request from the same IP within a rolling 24 hours is rejected with HTTP 429.
- A returning visitor with a live demo lands back in the same project with their edits, and the press does not count against the limit.
- After 12 hours the Clerk user, DB rows, and uploaded files are gone, and the demo session and cookie no longer work.
- If Upstash is unreachable, new demos are blocked with HTTP 503 and no Clerk user is created; resuming a live demo still works.
- If any creation step fails midway, the partially created Clerk user and DB rows are cleaned up.
- Seeding and rate-limit handling are covered by Vitest unit tests (database and Upstash mocked).

## Open questions
- Do demo users count toward any Clerk user limits on the current plan?
