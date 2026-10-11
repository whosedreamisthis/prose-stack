# Current Feature: Scene Editor

Tiptap editor for the open scene, with debounced autosave and the stats footer. Spec: `context/features/scene-editor-spec.md` (part 1 of 2; tools come in `scene-editor-tools-spec.md`).

## Status

In Progress

## Goals

- **Loading:** `/projects/[projectId]/manuscript` shows the scene from `?scene=<id>`, falling back to the first scene in reading order (`resolveActiveScene`). Read-only scene title above the editor, no breadcrumbs. Empty state for projects with no scenes. Switching scenes swaps content without a page reload, flushing unsaved edits first. Data fetch sits in its own `<Suspense>` with a skeleton.
- **Editor:** Tiptap + StarterKit (paragraphs, bold, italic, headings off, undo), content stored as Tiptap JSON. Centered comfortable column, serif-friendly font stack, size from `useEditorStore.fontSize`, native spellcheck from `useEditorStore.spellcheck`. Editor instance published to `useEditorStore` and cleared on unmount.
- **Autosave:** save 1.5 s after typing stops (`AUTOSAVE_IDLE_MS`), forced every 10 s while typing (`AUTOSAVE_MAX_WAIT_MS`); also on blur, scene switch, navigating away, tab hidden/closed. Only changed scenes, only when content changed. Never blocks typing; one save at a time, re-save if edited during a save.
- **Save status:** footer indicator Saving… / Saved / Couldn't save — retrying, driven by `saveStatus`, announced via `aria-live="polite"`.
- **Local copy:** localStorage per scene with server `updatedAt` and dirty flag, written as the writer types. On failed save keep text and retry with backoff; restore on reload per `chooseInitialContent`. Kept until server confirms, never expires, cleared once confirmed and unchanged. Newer server content is never silently overwritten.
- **Footer stats:** total words, pages (words ÷ `WORDS_PER_PAGE`, rounded up), words today (total minus `DailyWordCount.startWords`; 0 before first save of the day). Live from `liveWords`, settle to server numbers after. Footer sits below the writing area and does not scroll.
- **Accessibility:** writing area named "Scene text, <scene title>" and keyboard reachable; reduced motion respected; no autofocus on page load, focus moves to the editor only on explicit scene open.
- **Tests:** autosave scheduling (idle, max-wait, one at a time, dirty-while-saving), local-copy read/write, stats calculation (pages, words today), empty state.

## Notes

- Already built: `saveScene`/`saveSceneSummary` actions (`actions/manuscript.ts`), `getScene`/`getManuscript`/`getWordStats` (`lib/manuscript.ts`), word helpers (`lib/manuscript-text.ts`), `chooseInitialContent` (`lib/manuscript-sync.ts`), `useEditorStore`, `EditorColumn` and the `@toolbar` slot with disabled placeholder tools, Tiptap packages installed.
- Out of scope: toolbar tools (next spec), scene sidebar, read-aloud, search, book view, spellcheck beyond the native toggle.
- Decisions: title is read-only (rename in the tree); typing in an empty scene does not seed the title; unsaved local copies have no expiry.
- Per AGENTS.md, read the relevant guides in `node_modules/next/dist/docs/` before writing Next.js code.

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
- **Authentication:** Clerk sign-in/register in `app/(auth)`, route protection in `proxy.ts`, webhook user sync, first-request fallback in `lib/auth.ts`.
- **Projects:** `Project` model and migration, create/delete actions with a 5-project limit, `/projects` cover cards, navbar switcher, `/continue` landing on the last-opened project.
- **Sidebars & Layout:** project shell in `app/projects/[projectId]/layout.tsx` with collapsible left/right sidebars (parallel routes), mobile drawer, editor column, and project-only navbar stubs.
- **Project Accent Color:** `lib/accent.ts` derives `--primary`/`--ring` from the cover color, streamed per project as a `<style>` that turns off when the route is hidden; icon tooltips and breadcrumb removal included.
- **Manuscript Tree:** left-sidebar outline (book, parts, chapters, scenes) with add, rename and dnd-kit reorder; code in `components/manuscript/`, `lib/manuscript-tree.ts`, `actions/manuscript.ts`.
