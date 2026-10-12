# Current Feature: Trash & Archive

Pages to restore trashed items and to view and unarchive archived ones. Spec: [features/trash-archive-spec.md](features/trash-archive-spec.md).

## Status

In Progress

## Goals

- Trash page at `/projects/[projectId]/trash` listing trashed items (manuscript parts, chapters and scenes, characters, places, notes), each with **Restore** and **Delete permanently**.
- Archive page at `/projects/[projectId]/archive` listing archived items (characters, places), each with **Unarchive**.
- Restoring a part or chapter restores everything trashed with it (same `trashedAt`).
- Permanent delete asks for confirmation and is the only thing that removes rows.
- Trashed and archived items stay excluded from lists and word counts; restoring puts them back in the lists.
- Trash and Archive sections in the left sidebar, as the other sections.
- Everything scoped by `userId`/`projectId`, validated with Zod, with cache tags expired on every change.

## Notes

- Already in place: `trashedAt` on `ManuscriptNode` (set on the whole subtree together by `trashNode`), `Character`, `Place`, `CharacterNote` and `PlaceNote`; `archivedAt` on `Character` and `Place`. Trash actions and the shared `ConfirmTrashDialog` exist; there are no restore, unarchive or permanent-delete actions yet.
- Decide while building: where a restored node goes when its parent is still trashed (suggest: restore the parent chain, or put it at the top level), where it lands among its siblings (suggest: the end), and what a trashed note shows when its character or place is also trashed or archived.
- Archiving scenes, chapters and parts and notes is not built; the spec's archive requirement is met for characters and places first. Say so in the review if it stays that way.
- Follow the Characters and Places features for patterns (`actions/`, `lib/`, tagged `use cache` reads, `updateTag` in actions, skeletons, `SidebarSection`).
- No new user-created data, so no demo seed change; the demo user can trash and restore like anyone.

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
- **Demo User:** Try demo button creates or resumes a temporary seeded Clerk user, one per IP via namespaced Upstash keys, expiry enforced per request and by a daily cleanup cron; see `lib/demo*.ts`, `app/api/demo/`.
- **Places:** auto-saving place cards with related-character checkboxes, header add button, row menu to archive or trash, and sidebar notes via the shared `NotesList`; see `components/places/`, `actions/places.ts`, `lib/places.ts`.
