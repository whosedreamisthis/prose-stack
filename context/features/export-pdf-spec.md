# Export to PDF — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Account & Tools, §5 Architecture, §9 Monetization, §12 Open Questions.

## Summary

Export the manuscript as a PDF from the top navbar.

## Requirements
- **Export to PDF** button in the top navbar.
- Output is rendered from the same paginated content as the book view: title page (title, subtitle, "by", author), then chapters and scenes.
- Honors project formatting: font, font size, line spacing.
- Excludes trashed and archived items.

Exporting a single character, place, scene, chapter or part from its row menu is a separate spec: [export-item-pdf-spec.md](export-item-pdf-spec.md). It shares this feature's PDF renderer, so the approach below is decided once for both.

## Story bible export
- A second export in the navbar menu: **Export story bible**, a project-wide PDF of the reference material rather than the manuscript.
- Contents, each optional via a checkbox before exporting: **Characters** (all sketches and their notes, Main first), **Places** (all cards with related characters and notes), and later **Research** and **Plot** once those features exist.
- Layout: a cover page (title, "Story bible", author), a contents list, then one section per kind. Each character or place starts on a new page using the per-item layouts from [export-item-pdf-spec.md](export-item-pdf-spec.md).
- Excludes trashed and archived items, like every export. Scene text is not included; that is the manuscript export.
- Acceptance: only the owner can export; a project with no characters or places offers only what exists; a project of 50 characters and 50 places exports without timing out.

## Approach (decided)
A server-side PDF library, generated in a Route Handler. Browser print styles were rejected: they cannot guarantee page size, fonts or headers, and the item and story bible layouts are not on-screen pages. The specific library (for example PDFKit or `@react-pdf/renderer`) is chosen when the feature is built, checked against current docs and Next.js compatibility. Whole-book, per-item and story bible exports share one renderer module.

## Acceptance criteria
- Exported PDF matches the on-screen book view.
- Large manuscripts export without timing out.
- Only the signed-in owner can export a project.

## Open questions
- Print styles or PDF library?
- Should each chapter start on a new page?
- Possible paid feature later (see Monetization).
