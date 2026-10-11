# Export to PDF — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Account & Tools, §5 Architecture, §9 Monetization, §12 Open Questions.

## Summary

Export the manuscript as a PDF from the top navbar.

## Requirements
- **Export to PDF** button in the top navbar.
- Output is rendered from the same paginated content as the book view: title page (title, subtitle, "by", author), then chapters and scenes.
- Honors project formatting: font, font size, line spacing.
- Excludes trashed and archived items.

## Approach (undecided)
- Option A: browser print styles on the book view (simple, no dependency).
- Option B: a PDF library, server-side (more control over pagination and fonts).

## Acceptance criteria
- Exported PDF matches the on-screen book view.
- Large manuscripts export without timing out.
- Only the signed-in owner can export a project.

## Open questions
- Print styles or PDF library?
- Should each chapter start on a new page?
- Possible paid feature later (see Monetization).
