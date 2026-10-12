# Current Feature: Research

A research library per project: notes and links in nested folders, optionally linked to a character, place or scene, in a Research section under Places.

## Status

In Progress

## Goals

- **Data:** `ResearchType` enum (NOTE, LINK, IMAGE, FILE; the last two used from Part 2), `ResearchFolder` (self-nesting, `position`, `trashedAt`, `archivedAt`) and `ResearchItem` (`content` Json for NOTE, `url`, `description`, `position`, optional `characterId`/`placeId`/`sceneId` with SetNull, `trashedAt`, `archivedAt`), one migration.
- **Sidebar:** a Research section after Places, before Archive, with a `+` that adds a top-level note; a tree of collapsible folders and items with type icons; optimistic highlight and a skeleton while loading.
- **Row menus:** folders get Add note, Add link, Add folder, Rename, Move to…, Archive, Trash. Items get Rename, Move to…, Link to…, Export as PDF (NOTE only), Archive, Trash.
- **Drag and drop:** reorder and move items and folders between folders (dnd-kit, like the outline). A folder can't go into itself or a descendant, and folders nest at most 4 levels. The server enforces both.
- **Main pane** at `/projects/[projectId]/research?item=<id>`:
  - NOTE: title plus a Tiptap editor with the scene editor's extensions and formatting, debounced autosave and save status.
  - LINK: title, an `http(s)`-only URL, description, and an "Open link" button with `noopener noreferrer`. No server fetch of the page.
  - No item open: an empty state with Add note / Add link, plus Add starter folders when the project has no research.
- **Starter folders:** Magic & Technology, Cultures, History, Geography, Politics. Created on request as ordinary, deletable folders.
- **Story links:** an item links to at most one character, place or scene. It shows as a chip that opens the target, set from "Link to…" or a picker in the pane. The chip hides while the target is trashed or archived.
- **Trash and archive:** items and folders show on the Trash and Archive pages with restore and delete forever. A folder's whole subtree hides and restores together, using the same timestamp.
- **Limits:** 500 items and 100 folders per project; titles and names up to 120 characters; URLs up to 2,048; descriptions up to 2,000.
- **Plumbing:**
  - Cached reads in `lib/research.ts` with tags in `lib/cache-tags.ts`, refreshed by `actions/research.ts`.
  - An empty `@right/research` page, so no right panel shows.
  - NOTE export through `/api/export/research/[id]`.
- **Demo seed:** starter folders, two notes, one link, one note linked to a character and one to a place.
- **Tests:**
  - Unit tests for the actions: ownership, Zod validation, move and cycle rules, depth limit and item limits.
  - Unit tests for the tree helpers.
  - Demo seed test updated.

## Notes

- Spec: `context/features/research-spec.md`. Part 2 (image and file uploads with UploadThing) is `context/features/research-uploads-spec.md`, a separate feature.
- No separate Notes section. NOTE research items are the standalone notes, and `ProjectNote` already covers manuscript-wide notes.
- Every action checks project ownership and scopes by `userId`/`projectId`. A moved item stays in its project, and a link target must belong to the same project.
- Later (not this version): a Research tab on character, place and scene panels. Decided against: several links per item, labels on research.
- Reuse existing patterns: `SidebarSection`, the manuscript tree's dnd and keyboard handling, `RowMenu`, `HiddenItemsList` and `lib/trash.ts` kinds, `SceneEditor` extensions and autosave, the pending-nav skeleton store, and `lib/demo-seed.ts`.

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
- **Plot:** plot lines grid at `/plot` with draggable points, single-line view, Plots sidebar section and scene tab, trash support, demo seed; see `components/plot/`, `actions/plot.ts`, `lib/plot.ts`.
- **Settings: Labels:** Labels tab in settings (custom colors, usage counts, autosave), color bars on outline rows, label chips and picker for plot points, demo seed; see `components/settings/LabelsTab.tsx`, `actions/labels.ts`, `lib/labels.ts`.
- **Read Aloud:** toolbar button speaks the scene or selection in chunks with pause, resume and stop; see `hooks/useReadAloud.ts`, `lib/read-aloud.ts`, `EditorToolbar.tsx`.
