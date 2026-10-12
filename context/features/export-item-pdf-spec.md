# Export Item to PDF — Feature Spec

Source: [export-pdf-spec.md](export-pdf-spec.md) (whole-manuscript export); related: [characters-spec.md](characters-spec.md), [places-spec.md](places-spec.md), [scene-editor-spec.md](scene-editor-spec.md), [notes-research-spec.md](notes-research-spec.md).

## Summary

Export a single item to a PDF from its row's "…" menu: a character sketch, a place card, a scene, or a chapter or part (the scenes under it). Whole-book export stays in the navbar and is specced separately; both share one PDF renderer.

## Requirements
- An **Export as PDF** item in the hover "…" menu of: characters, places, scenes, chapters and parts. It sits above the red **Move to trash** item, separated from it.
- Notes: a character's or place's notes are included in that item's PDF (after the sketch), not exported on their own in v1.
- What each PDF contains:
  - **Character:** name, group (Main or Supporting), every sketch field that has text, then its notes. Empty fields are left out, not printed as blanks.
  - **Place:** name, the card fields that have text, the related characters (live ones only), then its notes.
  - **Scene:** its text only, with no title and no title page.
  - **Chapter:** the chapter title, then each scene's text in order, separated by a blank space. Scene titles are not printed, and scenes do not start on a new page.
  - **Part:** the part title, then each chapter (its title, then its scenes as above) in order. Trashed items are excluded.
- Text follows the project's formatting for manuscript content (font, size, line spacing); sketch and card PDFs use a fixed, readable layout with the project title as a small header.
- File name: `<item name>.pdf`, with characters that are invalid in file names removed.
- The download starts straight from the menu click; the menu item shows a spinner and is disabled while the file is generated. Failure shows an error toast.
- Trashed and archived items are not exportable (their row menus are not shown, so this is enforced server-side as well).

## Approach
- Server-side generation in a Route Handler, `GET /api/export/[type]/[id]` with `type` one of `character`, `place`, `node` (scene, chapter, part). It returns `application/pdf` with `Content-Disposition: attachment`.
- The handler reads through the same cached, user-scoped reads the pages use, so ownership checks are not duplicated.
- Use the same PDF approach as whole-book export (decision pending there). Recommendation: a server-side PDF library, because print styles cannot guarantee page size, fonts or headers for non-manuscript layouts. The renderer is a small module with one function per item type, so the choice stays swappable.
- No new data is stored.

## Data
- None. Reads existing `Character`, `CharacterNote`, `Place`, `PlaceNote`, `ManuscriptNode`.

## Routes
- `GET /api/export/character/[id]`, `GET /api/export/place/[id]`, `GET /api/export/node/[id]`, each taking `?projectId=`.

## Acceptance criteria
- Only the signed-in owner can export; another user's id returns 404 (not 403) and a signed-out request is redirected like other non-public routes.
- A character with no filled fields still exports (name only); an empty scene exports a blank page.
- A chapter or part never includes trashed scenes; related characters that were trashed are left out of a place PDF.
- A scene of 20,000 words exports without timing out.
- Input is validated with Zod; ids are never used to build file paths.
- The demo user can export (it writes nothing).

## Open questions
- The combined story bible export lives in [export-pdf-spec.md](export-pdf-spec.md); it reuses this spec's character and place layouts.
- PDF library choice (shared with whole-book export).
