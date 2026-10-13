# Book View and Full Manuscript — Feature Spec

Source: [manuscript-spec.md](manuscript-spec.md); related: [manuscript-tree-display-spec.md](manuscript-tree-display-spec.md), [settings-formatting-spec.md](settings-formatting-spec.md), [export-pdf-spec.md](export-pdf-spec.md), [scene-editor-spec.md](scene-editor-spec.md), [sidebars-layout-spec.md](sidebars-layout-spec.md).

## Summary

Two separate things, built as two features:

1. **Full manuscript** (small): clicking the **Manuscript** header in the outline shows the whole manuscript as editable scenes, the same as the part and chapter views (`NodeBookView`) one level up.
2. **Book view** (larger): a read-only view that looks like a printed book, opened from an icon in the top navbar. Chapters start on a new page.

## 1. Full manuscript

- Route `/projects/[projectId]/manuscript/full`. The Manuscript header row in the outline opens it (it opened the book placeholder before); the chevron still collapses the tree.
- Renders every part, chapter and scene in reading order: part titles, chapter titles, then each chapter's scene text as lazy-mounted `embedded` editors (`LazySceneEditor`), exactly as the part view does. Trashed items are excluded.
- Titles are edited in the outline, not here. Autosave, the toolbar and find work as in the chapter view.
- Empty book: a hint to add a chapter from the Manuscript menu.
- Approach: generalise `NodeBookView` so book, part and chapter share one renderer. No new reads or data.

## 2. Book view

### Requirements
- A **Book view** icon button (book-open) with a tooltip in the top navbar's project actions (`ProjectNavActions`), next to Settings. It opens `/projects/[projectId]/manuscript/book`, replacing the "coming soon" placeholder. The outline no longer links to it.
- **Read-only.** Editing happens in the manuscript; the view offers an "Edit" link to the page's scene when a page is open.
- **Looks like a book:** pages of a fixed ratio on a neutral background with a paper look and a soft shadow, text set in the project's font, size and line spacing (scaled to fit the page), following the light or dark theme.
- **Title page first:** project title, subtitle, "by", author (empty ones left out), on its own page.
- **Chapters start on a new page.** A part gets its own page with just its title, before its first chapter. A chapter page begins with the chapter title; scenes inside a chapter run on, separated by a centered `* * *` (`SCENE_BREAK`, shared with PDF export). Scene titles are not shown. Page numbers sit at the bottom (title page and part pages unnumbered), with a small running header (project title).
- **Navigation:** previous and next buttons, Left/Right arrow keys, swipe on touch, a page-number jump, and a "Go to chapter" menu listing parts and chapters. The current page is kept in the URL (`?page=N`) so a refresh or link returns to it.
- **Layout by screen:** one page at a time on every screen size (no two-page spread). Pages run on with no blank pages: each chapter simply starts on the next page, so a chapter can begin on a left or right page of a spread.
- **Page turn:** a plain switch first. A page-turn animation is an experiment to try once the view works, then keep or drop it.
- **No contents page.**
- Empty book: only the title page, with a hint to add a chapter.

### Approach
- **One page model for the view and the PDF.** The page breaks must match whole-book PDF export, so pagination cannot depend on the browser's text layout. A pure `paginate` function (unit-tested) takes the content, the project's formatting and a fixed page size and margins (for example US Trade 6 x 9 in), and measures lines with the same font metrics the PDF renderer uses (pdfkit's), so both produce identical pages. It lives in `lib/`, runs on the server or the client, and the book view draws each page it returns; the PDF draws the same pages. It is re-run when the formatting changes, not when the screen size changes (the screen only scales the pages).
- The chosen fonts need real metrics for the PDF to match: the PDF currently uses built-in stand-in fonts (Times, Helvetica, Courier), so until fonts are embedded the book view's text would be set in those stand-ins' metrics or differ slightly from the on-screen font. Decide in the build: embed the chosen fonts in the PDF (best match), or accept the stand-ins in both.
- Content comes from the same cached reads as the manuscript (`getBookNodes` already returns every node with scene content). Text is rendered from the Tiptap JSON (paragraphs, bold, italic), the way the PDF renderer does it.
- The page layout is deliberately independent of the screen so a later PDF export can reuse the same page model.

### Data
- None. Reads `Project` (title, subtitle, author, formatting) and `ManuscriptNode`.

## Decisions
- Manuscript header = editable full manuscript; Book view = read-only, from a navbar icon.
- Whole-book PDF export is an "Export as PDF" item in the Manuscript row's "…" menu, not a navbar button; it prints the Book view's pages (see [export-pdf-spec.md](export-pdf-spec.md)).
- Each chapter starts on a new page, with no blank pages between.

- One page at a time on every screen size.
- No contents page.
- Page breaks match whole-book PDF export exactly (shared page model).
- Page-turn animation: try it after the view works, then decide.

- Page size 6 x 9 in with 0.75 in margins, fixed in v1 (a setting later).
- Embed the chosen fonts in the PDF so the book view and the PDF match; the stand-in fonts go away when this lands.
