# Current Feature: Demo User

A **Try demo** button that signs a visitor into a temporary, seeded account, one demo per IP, deleted after 12 hours. Spec: `context/features/demo-spec.md`.

## Status

In Progress

## Goals

- **Try demo** on the landing page creates (or resumes) a temporary Clerk user with a seeded project, signs the visitor in and lands on `/projects`.
- One live demo per IP: the IP (hashed, never stored raw) is claimed in Upstash Redis with `SET NX EX 43200`; the same IP always resumes the same demo; two simultaneous presses leave exactly one demo.
- Resume cookie (httpOnly, secure, signed) re-signs the visitor into their demo if their IP changed; ignored and cleared once the demo has expired.
- If Upstash is unreachable, new demos are blocked with HTTP 503 and no Clerk user is created; resuming through the cookie still works.
- A partly created demo (Clerk user, DB rows, IP slot) is cleaned up if any step fails.
- Demo users get a banner ("Demo - your data is deleted in X hours. Register to keep your work") whose Register link signs them out first.
- Expiry is enforced at request time: an expired demo is sent to a page that signs it out, even if the cleanup job has not run.
- Cleanup job (`GET /api/cron/cleanup-demos`, protected by `CRON_SECRET`) deletes expired demos (Clerk user first, then DB rows, then the IP key) and sweeps orphaned demo users out of Clerk; idempotent and retried on failure.
- The Clerk webhook never duplicates a demo user.
- Seeding, IP claim handling and cleanup have Vitest unit tests (database, Clerk and Upstash mocked).

## Notes

- **Shared Upstash:** the free-tier Redis is shared with other projects, so every key is namespaced `prosestack:demo:...` and the code only ever runs SET NX EX, GET and DEL on those keys, never a scan or flush. A busy neighbour can use up the shared command quota; because demo creation fails closed, that would block new demos (resuming via cookie still works).
- The IP is hashed with an HMAC keyed by `DEMO_COOKIE_SECRET`, so the hash can't be reversed by trying every IPv4 address.
- The IP key's value is the demo's Clerk id; it is first claimed with a pending marker and then filled in, because the Clerk user doesn't exist yet when the slot is claimed. A reverse key (`prosestack:demo:user:<clerkId>`) lets cleanup free the IP slot.
- Seed content covers what exists today (parts, chapters, scenes, characters and notes); plot lines, places and research are added to the seed when those features ship. Uploads don't exist yet, so there is nothing to disable.
- Vercel Hobby allows one cron run per day, so request-time expiry is what blocks an expired demo in the meantime. `vercel.json` gets the cron entry.
- The sign-in uses a Clerk sign-in token: the server mints it (`clerkClient.signInTokens`) and the browser redeems it with `signIn.ticket()`.
- New env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DEMO_COOKIE_SECRET`, `CRON_SECRET` (in `.env.example`; the real values go in `.env.local` and the Vercel project).

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
- **Authentication:** Clerk sign-in/register in `app/(auth)`, route protection in `proxy.ts`, webhook user sync, first-request fallback in `lib/auth.ts`.
- **Projects:** `Project` model and migration, create/delete actions with a 5-project limit, `/projects` cover cards, navbar switcher, `/continue` landing on the last-opened project.
- **Sidebars & Layout:** project shell in `app/projects/[projectId]/layout.tsx` with collapsible left/right sidebars (parallel routes), mobile drawer, editor column, and project-only navbar stubs.
- **Project Accent Color:** `lib/accent.ts` derives `--primary`/`--ring` from the cover color, streamed per project as a `<style>` that turns off when the route is hidden; icon tooltips and breadcrumb removal included.
- **Manuscript Tree:** left-sidebar outline (book, parts, chapters, scenes) with add, rename and dnd-kit reorder; code in `components/manuscript/`, `lib/manuscript-tree.ts`, `actions/manuscript.ts`.
- **Scene Editor:** Tiptap editor per scene with debounced autosave, local backup copy and stats footer; code in `components/manuscript/SceneEditor.tsx`, `lib/autosave-scheduler.ts`, `hooks/useSceneAutosave.ts`.
- **Scene Editor Tools:** toolbar with undo/redo, font size menu, find and replace panel and thesaurus popover; code in `components/layout/EditorToolbar.tsx`, `components/manuscript/FindPanel.tsx`, `app/api/thesaurus/`.
- **Characters:** auto-saving sketches grouped Main/Supporting, row menu to archive or trash, multi-note Notes tab in the right sidebar; code in `components/characters/`, `actions/characters.ts`, `lib/characters.ts`, `ProjectSidebar.tsx`.
- **Read Caching:** tagged `use cache` reads for projects, outline, scenes, characters and notes, expired by `updateTag` in the actions, plus a 5-minute browser cache and hover prefetch; see `lib/cache-tags.ts`, `next.config.ts`.
