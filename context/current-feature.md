# Current Feature: Settings: Labels

Labels tab in the settings modal: named colors writers attach to scenes and plot points. Spec: [features/settings-labels-spec.md](features/settings-labels-spec.md).

## Status

Not Started

## Goals

- Labels tab listing labels with color swatch, name and scene/plot-point usage counts
- Add (inline name + color), rename in place, recolor (preset palette + custom color with contrast warning), delete with usage-count confirmation (`onDelete: SetNull`)
- Names unique per project (case-insensitive, trimmed, 1-40 chars); max 20 labels; `#rrggbb` color validated
- Each change saves immediately with rollback and error toast on failure
- `Label` model; `ManuscriptNode.labelId` becomes a relation; `actions/labels.ts`, cached `lib/labels.ts` with `cacheTags.labels`
- Label shown as a color bar at the right of scene/chapter/part rows in the left sidebar (tooltip + aria-label)
- Label chip (bookmark icon + name) on plot cards in the right sidebar once plots exist
- Seed the demo user with labels (Draft, Revise, Final) applied to some scenes/chapters/parts; test in `lib/demo-seed.test.ts`
- Keyboard-operable; other projects'/users' labels never accessible

## Notes

- Applying labels to scenes (sidebar picker) and plot points belongs to those features; this feature provides labels and the SetNull guarantee.
- Open questions: preset-only vs custom colors (spec allows custom), one label per scene (current model), reorderable vs alphabetical.

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
- **Chapter and Part View:** clicking a chapter or part opens it as editable book text with lazy-loaded scene editors; see `components/manuscript/NodeBookView.tsx`, `LazySceneEditor.tsx`, `SceneEditor.tsx` (`embedded`).
- **Full Manuscript View:** the Manuscript header opens `/manuscript/full`, the whole book as editable lazy-loaded scenes; one `NodeBookView` renders book, part and chapter.
- **Book View:** read-only book from a navbar icon at `/manuscript/book`: title page, pages by chapter, two-page spread, swipe and slide animation; see `components/book/BookView.tsx`, `lib/book/paginate.ts`.
- **Whole-Book PDF Export:** "Export as PDF" in the Manuscript row menu downloads the Book view's pages as a 6 x 9 in PDF with the project font embedded; see `lib/pdf/book.ts`, `lib/pdf/fonts.ts`.
