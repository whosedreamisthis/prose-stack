# Current Feature: Research Uploads

Adds IMAGE and FILE research items: upload an image or document into the Research library, view or download it, and delete stored files when items are deleted for good. Spec: `context/features/research-uploads-spec.md`.

## Status

In Progress

## Goals

- UploadThing file router at `/api/uploadthing` with `researchImage` and `researchFile` endpoints
- Router middleware checks the signed-in user (`getCurrentUser`) owns the project; others are refused before bytes are stored
- `onUploadComplete` creates the `ResearchItem` on the server (type, title from file name, `url`, `fileKey`, `fileName`, `fileSize`, `mimeType`, folder); client never sends the URL
- **Upload image** / **Upload file** in the folder row menu and the Research `+` menu; item lands in that folder or the top level
- Drag files from the desktop onto a folder row or the empty Research pane to upload
- Upload progress shown in the new row; a failed upload removes the row and toasts the reason (wrong type, too large, storage full)
- IMAGE view: title, image fitted to the pane (click opens full size in new tab), description
- FILE view: title, file name, size and type, **Download** button, description; PDFs also get "Open in new tab"
- Rename, Move to…, Link to…, Archive and Trash work as for notes and links; no Export as PDF for uploads
- Limits enforced server-side: images JPEG/PNG/WebP/GIF ≤ 4 MB; files PDF/TXT/DOCX ≤ 8 MB
- 100 MB research storage per project (sum of `fileSize` across live, archived and trashed items), checked on the server before accepting an upload
- Deleting an IMAGE/FILE forever (or a folder holding them) calls `UTApi.deleteFiles(fileKeys)`; trash-emptying cron and demo cleanup cron do the same before removing rows
- A failed storage delete is logged and does not block the database delete
- Unit tests: middleware ownership check, storage-cap check, file deletion on delete forever (UTApi mocked)

## Notes

- Install `uploadthing` + `@uploadthing/react`; read current UploadThing Next.js App Router docs via Context7 before writing code.
- Data: `ResearchItem` gains `fileKey String?`, `fileName String?`, `fileSize Int?`, `mimeType String?` if not already added in Part 1. No new models.
- `next.config.ts`: allow the UploadThing image host in `images.remotePatterns` for `next/image`.
- Env: `UPLOADTHING_TOKEN` in `.env` and on Vercel.
- Demo seed: no uploaded files; demo users upload within the same limits and demo cleanup removes their files.
- Decided: types, sizes and the 100 MB cap stay as listed; no thumbnails in the sidebar tree (type icons only), the image shows in the main pane.

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
- **Research:** Research section under Places with nested folders, notes and links, drag and drop, story links, trash/archive, Utilities section, Empty trash; see `components/research/`, `actions/research.ts`, `lib/research*.ts`.
