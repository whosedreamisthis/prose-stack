# Current Feature: Scene Editor Tools

The editor's toolbar above the main pane (`@toolbar` slot): undo, redo, find and replace, font size and thesaurus, wired to the open editor. Spec: `context/features/scene-editor-tools-spec.md` (part 2 of 2).

## Status

In Progress

## Goals

- **Toolbar:** every tool is disabled (greyed, with tooltip) while no editor is published to `useEditorStore`, enabled as soon as one is. Tooltips show name and shortcut. `role="toolbar"` with roving focus (arrow keys), all buttons labelled.
- **Undo / Redo:** buttons call the editor's undo/redo and are disabled when there is nothing to undo or redo (follow transactions). Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y on Windows. History is clean per scene.
- **Font size:** menu of `FONT_SIZES` (10–18 pt) with the current size marked. Applies to the writing area for every scene, immediately, remembered per browser, never triggers a save.
- **Find and replace:** panel opened with Ctrl/Cmd+F in the editor or the button; Escape closes and returns focus to the editor. Find, replace and case-sensitive fields; "n of m" with all matches highlighted and the current one emphasised. Next/Previous (Enter / Shift+Enter), Replace, Replace all, all undoable and saved by autosave. Open scene only. "No results" state; empty find clears highlights. Match count announced politely; panel is a labelled region.
- **Thesaurus:** select a word or place the cursor in one, then button or Ctrl/Cmd+Shift+T opens a popover of synonyms. `/api/thesaurus?word=…` proxies Datamuse (`rel_syn`), validates the query, limits results, returns `{ words: string[] }`. Choosing a synonym replaces the word, keeping surrounding punctuation and the first letter's capitalisation. Loading, empty ("No synonyms found") and error ("Couldn't reach the thesaurus") states; debounced, cancelled on close; cached per session; focus returns to the editor on close.
- **Tests:** find (case sensitivity, no matches, replace all), synonym replacement (casing, punctuation), thesaurus route (validation, success, upstream failure).

## Notes

- Already built: `SearchReplace` extension and `findMatches` (`lib/search-replace-extension.ts`), `useEditorStore` (`editor`, `findOpen`, `fontSize`, `spellcheck`), `chunkText` and word helpers, `EditorToolbar` with disabled placeholders (`components/layout/EditorToolbar.tsx`). The scene editor does not register the `SearchReplace` extension yet.
- Out of scope: read aloud, spell check, project-wide search, formatting buttons beyond keyboard defaults, dictionary lookup.
- Open questions: whole-word matching in find? Thesaurus as popover at the cursor or side panel?
- Discussed, not in the spec: a font family setting (Serif default, Sans, Courier-style mono) next to font size in the same menu, stored like `fontSize`.
- Per AGENTS.md, read the relevant guides in `node_modules/next/dist/docs/` before writing Next.js code (the route handler for `/api/thesaurus`).

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
- **Authentication:** Clerk sign-in/register in `app/(auth)`, route protection in `proxy.ts`, webhook user sync, first-request fallback in `lib/auth.ts`.
- **Projects:** `Project` model and migration, create/delete actions with a 5-project limit, `/projects` cover cards, navbar switcher, `/continue` landing on the last-opened project.
- **Sidebars & Layout:** project shell in `app/projects/[projectId]/layout.tsx` with collapsible left/right sidebars (parallel routes), mobile drawer, editor column, and project-only navbar stubs.
- **Project Accent Color:** `lib/accent.ts` derives `--primary`/`--ring` from the cover color, streamed per project as a `<style>` that turns off when the route is hidden; icon tooltips and breadcrumb removal included.
- **Manuscript Tree:** left-sidebar outline (book, parts, chapters, scenes) with add, rename and dnd-kit reorder; code in `components/manuscript/`, `lib/manuscript-tree.ts`, `actions/manuscript.ts`.
- **Scene Editor:** Tiptap editor per scene with debounced autosave, local backup copy and stats footer; code in `components/manuscript/SceneEditor.tsx`, `lib/autosave-scheduler.ts`, `hooks/useSceneAutosave.ts`.
