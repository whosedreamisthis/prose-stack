# Scene Editor Tools — Feature Spec

Part 2 of 2, split from [manuscript-spec.md](manuscript-spec.md). Depends on [scene-editor-spec.md](scene-editor-spec.md) (the editor instance must be published to `useEditorStore`).

## Summary

The editor's toolbar, rendered above the main pane through the `@toolbar` slot: undo, redo, find and replace, font size and thesaurus. They are disabled placeholders today (`components/layout/EditorToolbar.tsx`); this feature wires them to the open editor.

Read aloud, spell check and scene search have their own specs ([read-aloud-spec.md](read-aloud-spec.md), [spell-check-spec.md](spell-check-spec.md), [scene-search-spec.md](scene-search-spec.md)) and are not part of this one.

## Already built

- `SearchReplace` Tiptap extension and `findMatches` (`lib/search-replace-extension.ts`).
- `useEditorStore`: `editor`, `findOpen`, `fontSize` (persisted, `FONT_SIZES`), `spellcheck`.
- `chunkText` and word helpers in `lib/manuscript-text.ts`.

## Requirements

- Every tool is disabled (greyed, with its tooltip) while no editor is open, and enabled as soon as the open scene's editor is published to the store.
- Tooltips show the tool name and its shortcut.

### Undo / Redo
- Buttons call the editor's undo and redo; each is disabled when there is nothing to undo or redo (updates with the editor's transactions).
- Shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (and Ctrl+Y on Windows).
- History does not carry across scenes: switching scenes starts a clean history.

### Font size
- A menu with the sizes in `FONT_SIZES` (10–18 pt); the current size is marked.
- Changes the writing area's size for every scene, not the stored text; remembered in this browser (already persisted by the store).
- Takes effect immediately and does not trigger a save.

### Find and replace
- Opens a small panel (Ctrl/Cmd+F while the editor is focused, or the toolbar button); Escape closes it and returns focus to the editor.
- Fields: find, replace, case-sensitive toggle. Shows "n of m" and highlights all matches in the scene, with the current match emphasised.
- Next / Previous (Enter / Shift+Enter), Replace, Replace all. Replacements are undoable and are saved by autosave like any edit.
- Searches the open scene only (project-wide search is [scene-search-spec.md](scene-search-spec.md)).
- No matches shows "No results"; an empty find field clears highlights.

### Thesaurus
- Select a word (or place the cursor in one) and use the toolbar button or Ctrl/Cmd+Shift+T to open a popover of synonyms.
- Synonyms come from `/api/thesaurus?word=…`, a server route that proxies Datamuse (`rel_syn`), validates the query, limits the result count, and returns `{ words: string[] }`.
- Choosing a synonym replaces the selected word, keeping surrounding punctuation and capitalisation of the first letter.
- Loading, empty ("No synonyms found") and error ("Couldn't reach the thesaurus") states are shown. Requests are debounced and cancelled when the popover closes.
- Results for a word are cached for the session so repeat lookups are instant.

## Accessibility

- The toolbar is `role="toolbar"` with roving focus (arrow keys), all buttons labelled.
- The find panel is a labelled region; match count changes are announced politely.
- The thesaurus popover returns focus to the editor on close.

## Acceptance criteria

- Undo/redo, font size, find and replace and thesaurus work on the open scene; tools are disabled when no scene is open.
- Replace and Replace all are undoable and persist via autosave.
- Font size persists across reload and does not mark the scene as edited.
- `/api/thesaurus` rejects missing or over-long words, handles Datamuse failures with a clear error, and never returns more than the limit.
- Unit tests cover: find (case sensitivity, no matches, replace all), synonym replacement (casing, punctuation), and the thesaurus route (validation, success, upstream failure).

## Out of scope

Read aloud, spell check, project-wide search, formatting buttons beyond the keyboard defaults (bold/italic), and a dictionary/definitions lookup.

## Open questions

- Should find and replace also offer whole-word matching?
- Show the thesaurus as a popover at the cursor or as a side panel?
