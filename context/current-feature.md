# Current Feature: Export Item to PDF

Export a single item (character, place, scene, chapter or part) to a PDF from its row's "…" menu. Spec: `context/features/export-item-pdf-spec.md`.

## Status

In Progress

## Goals

- Add an **Export as PDF** item to the hover "…" menu of characters, places, scenes, chapters and parts, above the red **Move to trash** item and separated from it.
- PDF contents:
  - **Character:** name, group (Main or Supporting), every sketch field with text, then its notes. Empty fields omitted.
  - **Place:** name, card fields with text, related characters (live only), then its notes.
  - **Scene:** its text only, no title, no title page.
  - **Chapter:** chapter title, then each scene's text in order separated by a centered "* * *" (the book view will use the same separator); no scene titles, no page breaks between scenes.
  - **Part:** part title, then each chapter (title, then its scenes as above) in order. Trashed items excluded.
- Manuscript text follows the project's formatting (font, size, line spacing); character and place PDFs use a fixed readable layout with the project title as a small header.
- File name `<item name>.pdf` with invalid file-name characters removed.
- Download starts straight from the menu click; the item shows a spinner and is disabled while generating; failure shows an error toast.
- Trashed and archived items are not exportable (no menu item, and enforced server-side).
- Server-side generation in `GET /api/export/[type]/[id]?projectId=` (`type` = `character` | `place` | `node`), returning `application/pdf` with `Content-Disposition: attachment`.
- Handler reads through the same cached, user-scoped reads the pages use; renderer is a small module with one function per item type so the PDF library stays swappable.
- Acceptance: only the owner can export (other user's id returns 404, signed-out is redirected); a character with no fields exports name only; an empty scene exports a blank page; trashed scenes and trashed related characters are left out; a 20,000-word scene exports without timing out; input validated with Zod and ids never used to build file paths; the demo user can export.

## Notes

- No new data stored; reads existing `Character`, `CharacterNote`, `Place`, `PlaceNote`, `ManuscriptNode`.
- The PDF library is chosen at build time and shared with whole-book export (`context/features/export-pdf-spec.md`), which reuses the character and place layouts.
- Related specs: characters, places, scene-editor, notes-research.

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
