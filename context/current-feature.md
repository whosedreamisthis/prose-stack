# Current Feature

<!-- Feature name and short description -->

## Status

<!-- Not Started | In Progress | Complete -->

Completed

## Goals

<!-- Goals and requirements -->

## Notes

<!-- Any extra notes -->

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
- **Book View:** read-only book from a navbar icon at `/manuscript/book`: title page, pages by chapter, single page view, swipe and slide animation; see `components/book/BookView.tsx`, `lib/book/paginate.ts`.
- **Whole-Book PDF Export:** "Export as PDF" in the Manuscript row menu downloads the Book view's pages as a 6 x 9 in PDF with the project font embedded; see `lib/pdf/book.ts`, `lib/pdf/fonts.ts`.
- **Plot:** plot lines grid at `/plot` with draggable points, single-line view, Plots sidebar section and scene tab, trash support, demo seed; see `components/plot/`, `actions/plot.ts`, `lib/plot.ts`.
- **Settings: Labels:** Labels tab in settings (custom colors, usage counts, autosave), color bars on outline rows, label chips and picker for plot points, demo seed; see `components/settings/LabelsTab.tsx`, `actions/labels.ts`, `lib/labels.ts`.
- **Read Aloud:** toolbar button speaks the scene or selection in chunks with pause, resume and stop; see `hooks/useReadAloud.ts`, `lib/read-aloud.ts`, `EditorToolbar.tsx`.
- **Research:** Research section under Places with nested folders, notes and links, drag and drop, story links, trash/archive, Utilities section, Empty trash; see `components/research/`, `actions/research.ts`, `lib/research*.ts`.
- **Research Uploads:** upload images and files (JPEG/PNG/WebP/GIF, PDF/TXT/DOCX) into Research via UploadThing, with caps, progress rows, drag and drop; see `app/api/uploadthing/`, `lib/research-uploads.ts`.
- **Spell Check:** navbar toggle, nspell underlines and a hover popover with replacements, Add to dictionary and Ignore; see `lib/spell-engine.ts`, `lib/spellcheck-extension.ts`, `SpellSuggestPopover.tsx`.
- **Scene Search:** search box above the outline finds scenes by title, summary, text or label, results under the Manuscript row; see `actions/search.ts`, `lib/scene-search.ts`, `SceneSearch.tsx`.
- **Story Templates:** Structure sidebar section with built-in story templates, covered beats and scene links, a select in new-project and General settings, demo seed; see `lib/story-templates.ts`, `actions/story.ts`, `components/structure/`.
- **Character Name Generator:** Generate name button with gender select on the character sketch, names from lazily loaded faker; see `lib/name-generator.ts`, `CharacterSketch.tsx`.
- **Summary Tab:** Summary tab with an autosaving text area for scenes, chapters and parts in the right sidebar; see `components/manuscript/SummaryTab.tsx`, `saveNodeSummary`.
- **Proofreading:** manual Proofread of one scene or selection with free retext rules, a results panel, ignore list and Settings tab, plus bold/italic buttons; see `lib/proofread/`, `ProofreadPanel.tsx`, `/api/proofread`.
