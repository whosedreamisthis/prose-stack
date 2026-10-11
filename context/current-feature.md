# Current Feature: Read Caching

Cache the database reads behind the project pages so switching between characters, scenes and sections doesn't hit the database every time, and drop exactly the affected entries whenever something changes.

## Status

In Progress

## Goals

- Reads for the opened project are cached with Next.js `use cache` (Cache Components is already on): the project, the manuscript outline, a scene, word totals, the character list, a character's sketch and a character's notes.
- Each read is tagged with what it depends on, and the Server Action that changes it expires those tags with `updateTag`, so the next read is fresh and a stale entry is never served after a write.
- Switching back and forth between items that haven't changed does no database query for them.
- Autosaving a scene expires only that scene and the word totals, not the outline.
- Deleting or editing a project expires everything cached for it.
- The user id is part of every cache key, so a user can never read another user's entry.
- Unit tests pin which tags each action expires.

## Notes

- Follows `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md` and `updateTag.md`: `cacheLife` is set explicitly, tags via `cacheTag`, no request-time APIs inside cached functions.
- The default in-memory cache handler only persists on a self-hosted server; on serverless hosting entries may not survive between requests (`use cache: remote` or a custom `cacheHandlers` is the fix if so).
- The word-totals read takes the UTC day as an argument so it rolls over at midnight.
- The scene editor already refreshes the page after a save and keeps its own text, so expiring the scene on save is safe.

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
