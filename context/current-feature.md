# Current Feature: Plot

Plan the story with plot points, scene cards and a plot lines grid that links planning to scenes. Spec: [features/plot-spec.md](features/plot-spec.md).

## Status

In Progress

## Goals

- `PlotLine` and `PlotPoint` models (ordered by `position`); `PlotPoint.sceneId` required with `onDelete: Cascade`, `@@unique([plotLineId, sceneId])`, `trashedAt` on both (no label field yet)
- Plot grid at `/projects/[projectId]/plot` (`?line=<id>` focuses one line): scenes down the left in manuscript order, plot lines across, a plot point is the cell where they meet
- Add a point on an empty row creates the scene too (appended to the outline with a default title); empty state with "Add scene" when there are no scenes
- Add, rename, reorder and trash plot lines from the grid (column header menu, "Add plot line" column) and from the left sidebar (row menu), each appearing in both at once
- Drag and drop via dnd-kit (points between scenes, lines reorder); reordering persists in one transaction
- Left sidebar collapsible **Plots** section: "Plot grid" row, then one row per line; open grid or line highlighted like the selected scene
- Right sidebar Plots tab: compact cards per scene (at most one per line, with line name) built like `NotesList`; click a card or the add button opens an edit modal (text, plot line, scene which can change but never be empty); grid icon button (tooltip "Open plot grid") opens the grid
- A scene cannot get two plot points on the same line; a point can never exist without a scene
- Trashing a scene trashes its points, restoring restores them, permanent delete removes them; trashed points and lines appear in Trash as new kinds
- Plot board state managed with Zustand
- Seed the demo user with 2-3 plot lines and points on several scenes; test in `lib/demo-seed.test.ts`

## Notes

- Plot is built before Settings: Labels. Leave out `PlotPoint.labelId`, the label picker in the modal, label chips and labelled demo points; Settings: Labels ([features/settings-labels-spec.md](features/settings-labels-spec.md)) adds them later.
- Spec lists "plot points: draggable index cards" and "scene cards with summary, label and ellipsis menu (send to trash)".

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
