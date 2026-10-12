# Demo Account — Feature Spec

Source: user decision (replaces the single shared demo account in [project-overview.md](../project-overview.md) §3 Account & Tools). Related: [auth-spec.md](auth-spec.md).

## Summary

A **Try demo** button creates a temporary Clerk user with a seeded project. **Each IP address gets exactly one demo at a time**: pressing Try demo again from the same IP signs the visitor back into that same demo, while different IPs get separate, isolated demos. After 12 hours the Clerk user, the database user and all of its rows (and uploaded files) are deleted, which also frees that IP to create a new demo. Clerk is never left holding unused demo users (see Cleanup).

## Requirements
- **Try demo** button on the landing page (and optionally the sign-in/register pages).
- On press (server action or route handler):
  1. **IP lookup:** look up the caller's IP in Redis (see "One demo per IP"). If it maps to a live demo, mint a Clerk sign-in token for that demo user, sign the visitor in, and redirect to `/projects`. Any browser or device on that IP lands in the same demo with the same data. No new Clerk user is created.
  2. **Cookie fallback:** if the IP has no live demo but the visitor holds a valid, unexpired resume cookie (for example their IP changed mid-session), sign them back into that demo.
  3. Otherwise claim the IP slot, then create a Clerk user via the Clerk Backend API (generated unique email/username, no real credentials, `publicMetadata: { isDemo: true, demoExpiresAt }`).
  4. Create the `User` row (`isDemo = true`, `demoExpiresAt = now + 12h`).
  5. Seed a project: parts, chapters, scenes, plot lines, plot points, characters, places. **The seed grows with the app:** each later feature that adds user-created data (places, research, plot, notes...) extends `lib/demo-seed.ts` with sample rows for it, and a test, as part of that feature. Demos last 12 hours, so only new demos get the new rows; nothing is migrated.
  6. Sign the visitor in as that user (Clerk sign-in token / ticket), set the resume cookie, and redirect to `/projects`.
- Each IP gets its own brand-new user and project; nothing is shared between IPs.
- Resume cookie: httpOnly, secure, signed, holds the demo user's `clerkId`, expires with the demo. Used to re-mint a sign-in token if the Clerk session lapsed within the 12 hours. If the demo has already expired, the cookie is ignored and cleared and a new demo is created (the IP slot has expired too).
- A visible banner for demo users: "Demo — your data is deleted in X hours. Register to keep your work" linking to `/register`.
- **Demos cannot be converted to real accounts.** Demo data is never migrated. Visitors who want persistence register or sign in normally and start fresh.
- **Expiry:** after 12 hours, delete the Clerk user and the DB `User` (projects cascade, so every row for that user goes with it) and any UploadThing files. Expiry is also enforced at request time: a demo user whose `demoExpiresAt` has passed is signed out and blocked even if the cleanup job has not run yet.
- Uploads (covers, research files) are disabled or size-capped for demo users.

## One demo per IP (Upstash)
- Use **Upstash Redis** with an atomic claim per IP: `SET demo:ip:<hash> <clerkId> NX EX 43200` (12 hours), mapping the IP to its demo's `clerkId`. `@upstash/ratelimit` is not needed.
- Key: hash of the client IP (from trusted proxy headers, e.g. `x-forwarded-for`); the raw IP is never stored.
- The TTL equals the demo lifetime, so the slot frees itself when the demo expires. The cleanup job also deletes the key when it removes a demo, and a failed creation deletes it immediately.
- `NX` makes the claim race-safe: if two presses from one IP race, the loser deletes the Clerk user and DB rows it just created and signs into the winner's demo, so only one demo survives.
- Lookup is a plain `GET` on the key; a hit means "resume", a miss means "create".
- **Fail closed:** if Upstash is unreachable or errors, block new demo creation (HTTP 503, "Demos are temporarily unavailable, please try again shortly") rather than creating a demo unchecked. This protects the Clerk user quota. Resuming via the cookie fallback does not need Upstash and still works.
- **Known trade-off (accepted):** everyone behind one shared IP (office, school, mobile carrier NAT) lands in the same demo and can see and edit each other's changes. Demo data is throwaway and deleted after 12 hours.
- Because there is at most one live demo per IP, the number of demo users in Clerk at any time is bounded by the number of distinct IPs in the last 12 hours.

## Data (proposed — needs a migration via `prisma migrate dev`)
- `User.isDemo` (exists) and new `User.demoExpiresAt DateTime?` with an index.
- No rate-limit table; state lives in Upstash.

## Cleanup job (keeps Clerk free of unused demo users)
- Scheduled job (e.g. Vercel Cron hitting a protected route, or a Neon function) runs at least hourly. Vercel's Hobby plan limits cron jobs to once per day, so on Hobby use an external scheduler or accept up to 24 h of lag, relying on request-time expiry (above) to block expired demos meanwhile.
- **Expired demos:** find users where `isDemo` and `demoExpiresAt < now`. For each, delete the Clerk user first, then the DB user (cascading to all of their data), then the IP key, in batches. If the Clerk delete fails, leave the DB row in place so the next run retries; never delete the DB row while the Clerk user may still exist.
- **Orphan sweep:** also list Clerk users whose `publicMetadata.isDemo` is true and whose `demoExpiresAt` has passed, or that have no matching DB row (for example, creation failed midway or the process crashed), and delete them. This is the safety net against a messy Clerk dashboard.
- Both steps are idempotent: deleting something already gone is a no-op.
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
- Visitors on two different IPs pressing Try demo get two separate users and projects; edits in one never appear in the other.
- Pressing Try demo again from the same IP, in any browser or device, signs into the same demo user and project with all prior edits, and creates no new Clerk user.
- Two simultaneous requests from one IP leave exactly one demo (the loser's user is deleted).
- A visitor whose IP changed but who holds the resume cookie lands back in their demo.
- Once a demo expires, the same IP can create a new demo.
- After 12 hours the Clerk user, DB rows, and uploaded files are gone, and the demo session and cookie no longer work.
- The cleanup job leaves no demo users in Clerk: expired ones and orphans without a DB row are both removed, and a failed Clerk delete is retried on the next run.
- If Upstash is unreachable, new demos are blocked with HTTP 503 and no Clerk user is created; resuming via the cookie fallback still works.
- If any creation step fails midway, the partially created Clerk user and DB rows are cleaned up.
- Seeding, IP-claim handling, and cleanup are covered by Vitest unit tests (database, Clerk and Upstash mocked).

## Open questions
- Do demo users count toward any Clerk user limits on the current plan?
