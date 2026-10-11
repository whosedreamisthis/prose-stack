# Manuscript — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Manuscript, §5 Architecture, §6 Data Model.

## Summary

The core writing experience: a collapsible manuscript tree, a rich scene editor, and a paginated book view.

## Requirements

### Tree
- Collapsible tree: **Book → Part → Chapter → Scene** (chapters may sit directly under the book).
- Double-click any item to rename.
- **Add a scene** button at the end of each chapter.
- Reorder via drag and drop (dnd-kit); siblings ordered by integer `position`, updated in one transaction.
- New projects are seeded with Chapter 1 / Scene 1 ("Once upon a time...").

### Scene editor
- Tiptap editor with breadcrumbs, undo/redo, find & replace, font size, thesaurus, read-aloud, spell check.
- Toolbar order: breadcrumbs, toolbar, writing area, stats footer.
- Right sidebar shows and edits plot points linked to the scene (see [plot-spec.md](plot-spec.md)).
- Debounced autosave (≈1–2 s idle, on blur/navigation, periodic flush while typing); only the changed scene is saved; Saving/Saved indicator; local copy allows retry on failure.

### Footer stats
- Total words, pages, words today (from `DailyWordCount` snapshots).

### Book view
- Root of the tree renders the manuscript as paginated book pages.
- First page is a title page: title, subtitle, "by", author.

## Data
- `ManuscriptNode` (self-referencing; `type` = PART | CHAPTER | SCENE).
- Scene fields: `content` (Tiptap JSON), `summary`, `wordCount`, `labelId`.
- `DailyWordCount` for words-today.

## Routes
- `/projects/[projectId]/manuscript`
- `/projects/[projectId]/manuscript/book`
- `/api/thesaurus` (Datamuse proxy)

## Acceptance criteria
- Hierarchy rules are validated server-side (Part → Chapter → Scene).
- Renaming, reordering, adding a scene persist and survive reload.
- Typing triggers autosave without blocking input; failures retry.
- Word counts update per scene and roll up to project totals.

## Open questions
- Autosave debounce interval confirmation.
- Spell check: native vs `nspell`.
- Should each chapter start on a new page in book view?
