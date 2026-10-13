# Current Feature: Proofreading

A manual **Proofread** pass for punctuation, style and consistency on one scene or the current selection, built only on free open-source libraries (no AI, no paid service, no API key).

## Status

In Progress

## Goals

- **Proofread** tool in the editor toolbar and the scene's "…" menu, with a keyboard shortcut; reviews the open scene or the current selection only (never a chapter or the whole book).
- Results in a panel above the scene (like Find and replace), in reading order: flagged text in context, a short reason, and a replacement where there is one; clicking a suggestion highlights and scrolls to its text.
- Per suggestion: **Accept** (one undo step, changes only the flagged text), **Dismiss** (for this pass) and **Ignore always** (project ignore list, survives a reload).
- Switchable categories: punctuation and usage (repeated words, "a/an", contractions), style (filler/weasel words, passive voice, overlong sentences), consistency (a name spelled two ways against the project's characters and places, mixed quote styles).
- Fiction-aware: dialogue fragments and project character and place names are not flagged.
- Stale suggestions are marked out of date with **Run again** when the scene changes; "No suggestions" empty state; long scenes processed in chunks with progress and cancel.
- Settings: a Proofreading tab with the categories to show and the project ignore list (view and remove entries); English only. The settings tab strip on a phone shows one tab with left and right chevrons to cycle through the tabs.
- Bold and italic buttons in the editor toolbar (the marks and Ctrl/Cmd+B and +I already worked; book view and PDF already render them).
- `POST /api/proofread` (signed-in owner only, Zod-validated, light per-user rate limit, stricter for demo users); text never leaves the app's own server.
- `ProofreadIgnore` model (`projectId`, `kind`, `value`, unique together) with a migration via `prisma migrate dev`, not `db push`.
- A 5,000-word scene completes without timing out; a failure shows an error and leaves the scene untouched.
- Unit tests for the checkers, the suggestion format, the ignore list and the route.

## Notes

- Spec: `context/features/proofreading-spec.md`. Related: `spell-check-spec.md`, `scene-editor-spec.md`, `scene-editor-tools-spec.md`.
- Libraries only: the retext family for rules, nspell (already used) for spelling, our own code for consistency checks. Pick exact packages at the start and check their current docs.
- Open question: which retext packages give the fewest false positives on fiction; try them on the demo project.
- Out of scope: AI models, hosted or self-hosted LanguageTool, chapters or whole book, languages other than English, a paid tier.

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
