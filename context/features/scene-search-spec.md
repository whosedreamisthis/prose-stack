# Scene Search (Left Sidebar) — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Manuscript, §5 Architecture, §6 Data Model, §10 UI / UX. Related: [manuscript-spec.md](manuscript-spec.md), [sidebars-layout-spec.md](sidebars-layout-spec.md), [trash-archive-spec.md](trash-archive-spec.md).

**Depends on:** the Manuscript feature (scenes and the tree must exist). The left sidebar shell from Sidebars & Layout is already built.

## Summary

A search box at the top of the manuscript's left sidebar that finds the scenes containing the words you type. While you search, the tree is replaced by a list of matching scenes with a highlighted snippet; clicking one opens it. Clearing the search brings the tree back.

## Requirements

### Search box
- Lives at the top of the manuscript page's left sidebar (the `@left/manuscript` slot), above the tree. It is not shown on other pages (characters, places, and so on); they can get their own search later.
- Text input with a search icon, a clear button, and an accessible label ("Search scenes"). Escape clears it and returns focus to the input.
- Debounced (about 250 ms). Nothing is searched until there are at least 2 characters.
- Works in the mobile drawer exactly as in the desktop sidebar.
- **Ctrl+Shift+F** (**Cmd+Shift+F** on Mac) focuses the box from anywhere on the manuscript page, including while typing in the editor, and selects any text already in it. It pairs with Ctrl+F, which the editor's find and replace uses for the open scene. It is intercepted only on the manuscript page. Test on a Mac, where some browsers bind Cmd+Shift+F to full screen or a toolbar toggle.

### What it matches
- Scene **title**, **summary**, and **body text**. Matching is case-insensitive and ignores accents.
- The scene's **label name** (see [settings-labels-spec.md](settings-labels-spec.md)). There is no separate label filter: the same search box matches a label the same way it matches a word, so typing `Revise` finds scenes whose text contains "revise" and scenes labelled "Revise" (the matching rules below apply to the label name too, so `to do` finds a label called "To do"). A label is read from the `Label` table when the search runs, not stored in the search vector, so renaming or recoloring a label, or relabelling a scene, changes results at once. Chapter and part labels are not searched, only the scene's own.
- Several words mean **all of them** must appear in the scene, in any order. Each word may match in the text or in the label, so `revise storm` finds a scene labelled "Revise" whose body mentions "storm".
- A phrase in double quotes means those words next to each other, in order.
- **Whole words only**: `light` finds "light" and "Light", not "lighthouse". There is no stemming, so "walk" does not find "walking" (deliberate: names and places, the usual searches in a novel, match exactly and without false hits like "art" in "party"). A trailing `*` opts that one word into prefix matching (`light*` finds "lighthouse").
- Only scenes are matched. Chapter and part titles are not searched, because a match would return a whole chapter and the tree already finds those by name; each result still shows its chapter and part as context.
- Searches only the current project, and never another user's data.
- Scenes that are in the trash or archived are not searched (see [trash-archive-spec.md](trash-archive-spec.md)).

### Results
- Replaces the tree while the box is not empty. Shows a count ("12 scenes").
- Each result shows the scene title, where it sits (for example "Part 1 › Chapter 3", since the tree is hidden), and a snippet of about 120 characters around the first match with the matched words highlighted.
- A scene's label shows on its result as the same colored chip used in the outline, with matched words highlighted when the label is what matched. A scene that matched only through its label has no text snippet; it shows its summary or the start of its text instead.
- Ordered by relevance: title matches first, then label, then summary, then body; ties by tree order.
- At most 50 results; if there are more, say so ("Showing 50 of 132. Refine your search.").
- Empty state: "No scenes match “…”" with a hint to try fewer words.
- Clicking a result (or pressing Enter on it) opens the scene and keeps the search and results visible, so you can step through matches. Arrow keys move through results.
- Opening a result from a search highlights the matched words in the editor until the search is cleared.
- Loading state: keep showing the previous results (dimmed) rather than flashing empty; ignore responses that arrive out of order.

### State
- The query and results live in the Zustand store for the session, so they survive moving between scenes; they are not persisted across sessions or between projects.

### Server
- A Server Action `searchScenes(projectId, query)` returns the results; it is not an API route.
- Validated with Zod: `projectId` as for other actions, `query` trimmed and 2–100 characters.
- Scoped by the signed-in user's `userId` and the `projectId`; another user's project returns an empty result, never an error that confirms it exists.
- The query is turned into a Postgres full-text query from sanitized tokens (letters and numbers, plus an optional trailing `*` per word) and run through a parameterized `$queryRaw`; user text is never concatenated into SQL.

## Data

The scene body is stored as Tiptap JSON (`content`), which cannot be searched efficiently as is. This feature adds:

- `ManuscriptNode.plainText` (scene only): the plain text of `content`, written in the same save as `content` and `wordCount` (the plain text already has to be extracted for the word count).
- `ManuscriptNode.searchVector`: a generated `tsvector` column over title (weight A), summary (weight B), and `plainText` (weight C), using the `simple` text-search configuration (no language-specific stemming), with a GIN index. Prisma sees it as `Unsupported("tsvector")`, so the migration is written as SQL and queries use `$queryRaw`.
- Accent-insensitive matching uses Postgres's `unaccent` extension, enabled in the migration. Because `unaccent` is only "stable", a generated column needs a small `IMMUTABLE` SQL wrapper function around it, created in the same migration. The query side applies the same wrapper so both sides match.
- Migration `add_scene_search`. Scenes that already exist get `plainText` backfilled from their `content` as part of it.

No new environment variables. Full-text search and `unaccent` are both available on Neon.

## Routes
- No new routes. Opening a result goes to the existing `/projects/[projectId]/manuscript`, selecting the scene (the exact mechanism, for example a `scene` query parameter, follows whatever the Manuscript feature uses for selection).

## Out of scope
- Find and replace inside a scene (an editor feature).
- Searching characters, places, notes, or research, or searching across projects ("global search").
- Fuzzy or typo-tolerant matching, and language-specific stemming ("walk" finding "walking"); revisit if missing word forms prove annoying.

## Acceptance criteria
- Typing two or more characters shows matching scenes within about half a second on a project with several hundred scenes.
- A scene is found by a word in its label name as well, with the same search box; renaming the label changes what finds it immediately.
- A scene is found by a word in its title, its summary, or its body, and a scene without the word is not shown.
- Multiple words require all of them; a quoted phrase requires the words adjacent and in order.
- A word matches only as a whole word (`light` does not find "lighthouse"); `light*` does.
- Ctrl+Shift+F (Cmd+Shift+F on Mac) focuses the search box on the manuscript page and not elsewhere, and leaves Ctrl+F and Ctrl+K alone.
- Accents and capitalization do not matter.
- Trashed and archived scenes never appear.
- Another user's project returns nothing; the query cannot inject SQL or break the search (test with quotes, `&`, `|`, `:`, `*`, `\`, and very long input).
- Editing a scene and saving makes the new text searchable without a manual step.
- The tree returns, unchanged and in its previous expanded state, when the search is cleared.
- Works with the keyboard only (focus, type, arrow through results, Enter to open, Escape to clear) and in the mobile drawer.
- Search state survives opening scenes within a session, and is gone on reload.
- Unit tests (mocked Prisma) cover query sanitizing, validation, user scoping, and the result mapping; the SQL itself is verified once against a real branch.

## Open questions
- Include archived scenes behind a toggle?
- After opening a result, should the editor scroll to the first match?

Decided: whole-word matching with an optional trailing `*` for prefix; Ctrl/Cmd+Shift+F to focus (Ctrl+K stays free for inserting links); scenes only (no chapter or part titles).
