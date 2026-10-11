# Scene Editor — Feature Spec

Part 1 of 2, split from [manuscript-spec.md](manuscript-spec.md) (Scene editor, Footer stats). Followed by [scene-editor-tools-spec.md](scene-editor-tools-spec.md). Depends on the manuscript tree (done).

## Summary

The Tiptap editor for the open scene, with debounced autosave and the stats footer. Opening a scene from the tree loads it here; edits save without blocking typing.

## Already built

- `saveScene` and `saveSceneSummary` server actions (`actions/manuscript.ts`, tested): auth, Zod, word count computed on the server, `DailyWordCount` snapshot of the day's starting total.
- `getScene`, `getManuscript`, `getWordStats` (`lib/manuscript.ts`), word helpers (`lib/manuscript-text.ts`), `chooseInitialContent` for local-copy vs server (`lib/manuscript-sync.ts`, tested), `useEditorStore` (editor instance, save status, live words, font size, spellcheck).
- `EditorColumn` (writing area + footer) and the `@toolbar` slot with disabled placeholder tools.
- Tiptap packages installed (`@tiptap/react`, `starter-kit`).

## Requirements

### Loading
- The page at `/projects/[projectId]/manuscript` shows the scene from `?scene=<id>`; with none or an unknown id, the first scene in reading order (`resolveActiveScene`).
- The scene title shows above the writing area. No breadcrumbs: the tree shows where the scene sits. The title is not editable here (rename happens in the tree).
- A project with no scenes shows an empty state explaining how to add one.
- Switching scenes swaps the editor content without a full page reload; unsaved edits to the previous scene are flushed first.
- The scene loads without blocking the rest of the shell: the data fetch sits inside its own `<Suspense>` boundary with a skeleton.

### Editor
- Tiptap with StarterKit: paragraphs, bold, italic, headings off (prose only), undo history. Content stored as Tiptap JSON.
- Typography: comfortable line length (centered column), serif-friendly font stack, font size from `useEditorStore.fontSize`.
- Native browser spell check, driven by `useEditorStore.spellcheck`.
- The editor instance is published to `useEditorStore` so the toolbar (a separate parallel-route slot) can drive it, and cleared on unmount.

### Autosave
- Debounced: save 1.5 s after typing stops, and force a save every 10 s while typing (`AUTOSAVE_IDLE_MS`, `AUTOSAVE_MAX_WAIT_MS`).
- Also save on blur, on navigating away or switching scenes, and when the tab is hidden or closed (best effort).
- Only the changed scene is saved, and only when its content actually changed.
- Typing is never blocked by a save. Saves run one at a time; edits made during a save trigger another afterwards.
- Status indicator in the footer: Saving… / Saved / Couldn't save — retrying. Driven by `saveStatus`.
- A local copy (localStorage, keyed by scene) is written as the writer types, with the server `updatedAt` it is based on and a dirty flag. On a failed save the editor keeps the text, retries with backoff, and a reload or return to the scene restores the local copy per `chooseInitialContent`.
- A local copy is kept until the server confirms the save; it never expires. Once confirmed and unchanged, it is cleared.
- A save never overwrites newer server content silently: if the server's `updatedAt` moved on, the local copy loses (see `chooseInitialContent`).

### Footer stats
- Total words (project), pages (words ÷ `WORDS_PER_PAGE`, rounded up), and words today (current total minus `DailyWordCount.startWords`; 0 before the first save of the day).
- Counts update live from the open scene (`liveWords`) ahead of the save, and settle to server numbers after.
- The footer sits below the writing area and does not scroll with it.

## Accessibility

- The writing area has an accessible name ("Scene text, <scene title>") and is reachable by keyboard.
- Save status changes are announced politely (`aria-live="polite"`).
- Respects reduced motion; no autofocus stealing when the page loads from the tree (focus moves to the editor only on explicit scene open).

## Acceptance criteria

- Opening a scene from the tree shows its saved text; the right scene opens for `?scene=`, first scene by default.
- Typing triggers non-blocking autosave; reload shows the saved text.
- A failed save keeps the text, shows the error state, retries, and the text survives a reload.
- Word count per scene is stored by the server; totals and words today match across reload.
- Unit tests cover: autosave scheduling (idle, max-wait, one at a time, dirty-while-saving), local-copy read/write, the stats calculation (pages, words today), and the empty state.

## Out of scope

Toolbar tools (next spec), scene sidebar (see [scene-sidebar-spec.md](scene-sidebar-spec.md)), read-aloud, search, book view, spell check beyond the native toggle.

## Decisions

- The scene title is read-only above the editor; renaming happens in the tree.
- Typing in an empty scene does not seed the title.
- Unsaved local copies are kept until saved, with no expiry.
