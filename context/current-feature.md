# Current Feature: Projects

Create, list, open, switch between, and delete multiple books (projects) per user. Spec: `context/features/projects-spec.md`.

## Status

In Progress

## Goals

- Migration `add_project` adds the `Project` model (and its `LineSpacing` and `Theme` enums) from overview §7, related to `User` with cascade delete and `@@index([userId])`; add the `projects Project[]` relation to `User`
- Relations to models that do not exist yet (`nodes`, `characters`, `places`, etc.) are left out; later features add them in their own migrations
- Zod schema for project input (title and author required, length limits on all text fields), validated server-side
- Server Actions: create project, delete project (permanent, with cascade), and queries to list and get projects, every one scoped by the signed-in user's `userId`
- Opening another user's `projectId` shows the not-found page (`notFound()`); the HTTP status stays 200 because the page streams (accepted, see spec)
- Limit of 5 projects per user (`MAX_PROJECTS_PER_USER = 5`): create is rejected server-side at the limit (count and create in one transaction), and the "New project" actions are disabled with an explanation
- `Project.lastOpenedAt` (nullable) is set when a project is opened via a Server Action called from the manuscript page; a signed-in user visiting `/` lands on the project with the newest `lastOpenedAt`, or `/projects` when there are none; `/projects` never redirects
- `/projects`: cover cards (cover, title, author, last edited) sorted by most recently edited first, with a "New project" action
- Create flow: pick a cover design and color with live recolor, enter title (required), subtitle, author (required)
- On create, open the new project at `/projects/[projectId]/manuscript`
- `/projects/[projectId]/manuscript`: placeholder page that shows the project title, until the Manuscript feature
- Project switcher in the navbar: dropdown of projects plus "New project" and "All projects"; the route `projectId` is the source of truth, mirrored into a Zustand store for the active project
- Delete from a card menu with a confirmation that names the project; the user returns to `/projects`
- Unit tests for the Server Actions and queries (mocked Prisma): validation errors, user scoping, cross-user access returns not found, the 5-project limit, and last-opened landing choice

## Notes

- **Deferred to other features:** seeding Chapter 1 / Scene 1 (needs `ManuscriptNode`, Manuscript feature); cover image upload via UploadThing; word count per project (sum of scene `wordCount`); editing details in the settings modal (Settings feature); deleting uploaded files on project delete (nothing to delete until uploads exist); demo-user limits (Demo feature)
- Formatting settings fields (`fontFamily`, `fontSize`, `lineSpacing`, `theme`) come with the `Project` model and its defaults, so the Settings feature only needs UI
- `coverImageUrl` column exists but stays unused until uploads land
- Decisions made: delete is permanent with confirmation; limit of 5 projects per user; sign-in lands on the last-opened project (spec updated, no open questions left)
- If the last-opened project is deleted, landing falls back to the next most recently opened one, then to `/projects`
- Migration runs on the Neon `development` branch first; Vercel's build applies it to `production`
- Every query is scoped by the signed-in user's `userId`; never trust a client-supplied `userId`. Use `getCurrentUser()` from `lib/auth.ts`
- Read `node_modules/next/dist/docs/` before writing code; `cacheComponents` is on, so wrap runtime data (`auth()`, `params`, DB reads) in `<Suspense>`
- Landing redirect: `proxy.ts` sends signed-in visitors from `/` to `/continue`, a route handler (`app/continue/route.ts`) that redirects to the last-opened project or `/projects`, so no landing page renders first; the switcher reads the current project from the URL (`useParams`), not the store
- Root layout uses `<ClerkProvider dynamic>` inside `<Suspense>` so client components get the signed-in state on first render (fixes a `UserButton` hydration error)
- Replaces the placeholder `app/projects/page.tsx` from the Authentication feature, and changes the signed-in redirect in `app/page.tsx` from `/projects` to the last-opened project

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
- **Authentication:** Clerk sign-in/register in `app/(auth)`, route protection in `proxy.ts`, webhook user sync, first-request fallback in `lib/auth.ts`.
