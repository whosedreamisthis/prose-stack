# Current Feature: Chapter and Part View

Clicking a part or chapter opens it in editable book form instead of only toggling it.

## Status

In Progress

## Goals

- Clicking a chapter or part row in the outline opens `/manuscript/chapter/[nodeId]` or `/manuscript/part/[nodeId]`
- A part shows its chapters' titles between their scenes
- The view shows the chapter title as a header, with each scene's text below as an editable editor, in book form
- Edits autosave per scene; the toolbar follows whichever scene editor has focus
- The part or chapter icon still expands and collapses the chapter in the outline
- Empty chapters show a hint to add a scene

## Notes

- `SceneEditor` has an `embedded` mode for several editors on one page: no live footer count (totals settle after each save), toolbar and find panels follow the focused editor.
- Keyboard and tree behaviour are unchanged.

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
- **Authentication:** Clerk sign-in/register in `app/(auth)`, route protection in `proxy.ts`, webhook user sync, first-request fallback in `lib/auth.ts`.
- **Projects:** `Project` model and migration, create/delete actions with a 5-project limit, `/projects` cover cards, navbar switcher, `/continue` landing on the last-opened project.
- **Sidebars & Layout:** project shell in `app/projects/[projectId]/layout.tsx` with collapsible left/right sidebars (parallel routes), mobile drawer, editor column, and project-only navbar stubs.
- **Project Accent Color (superseded by Settings & Theme: now one constant indigo):** `lib/accent.ts` derives `--primary`/`--ring` from the cover color, streamed per project as a `<style>` that turns off when the route is hidden; icon tooltips and breadcrumb removal included.
- **Manuscript Tree:** left-sidebar outline (book, parts, chapters, scenes) with add, rename and dnd-kit reorder; code in `components/manuscript/`, `lib/manuscript-tree.ts`, `actions/manuscript.ts`.
- **Scene Editor:** Tiptap editor per scene with debounced autosave, local backup copy and stats footer; code in `components/manuscript/SceneEditor.tsx`, `lib/autosave-scheduler.ts`, `hooks/useSceneAutosave.ts`.
- **Scene Editor Tools:** toolbar with undo/redo, font size menu, find and replace panel and thesaurus popover; code in `components/layout/EditorToolbar.tsx`, `components/manuscript/FindPanel.tsx`, `app/api/thesaurus/`.
- **Characters:** auto-saving sketches grouped Main/Supporting, row menu to archive or trash, multi-note Notes tab in the right sidebar; code in `components/characters/`, `actions/characters.ts`, `lib/characters.ts`, `ProjectSidebar.tsx`.
- **Read Caching:** tagged `use cache` reads for projects, outline, scenes, characters and notes, expired by `updateTag` in the actions, plus a 5-minute browser cache and hover prefetch; see `lib/cache-tags.ts`, `next.config.ts`.
- **Demo User:** Try demo button creates or resumes a temporary seeded Clerk user, one per IP via namespaced Upstash keys, expiry enforced per request and by a daily cleanup cron; see `lib/demo*.ts`, `app/api/demo/`.
- **Places:** auto-saving place cards with related-character checkboxes, header add button, row menu to archive or trash, and sidebar notes via the shared `NotesList`; see `components/places/`, `actions/places.ts`, `lib/places.ts`.
- **Trash & Archive:** Trash and Archive pages and sidebar sections with row menus, a read-only view of any trashed or archived item, restore, permanent delete and unarchive; see `components/trash/`, `actions/trash.ts`, `lib/trash.ts`.
- **Settings & Theme:** settings modal (General, Appearance), per-user light/dark theme with no-flash paint, constant indigo accent, logo favicon; see `components/settings/`, `lib/theme-config.ts`, `actions/settings.ts`.
- **Settings Formatting:** Formatting tab with 12 fonts (incl. Courier Prime), size 10-18, line spacing, live preview; toolbar size menu saves the same setting; see `components/settings/FormattingTab.tsx`, `lib/formatting.ts`.
- **Export Item to PDF:** "Export as PDF" in character, place, scene, chapter and part row menus, served by `/api/export/[type]/[id]` and rendered with pdfkit; see `lib/export.ts`, `lib/pdf/`.
