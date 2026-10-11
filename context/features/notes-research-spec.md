# Notes & Research — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Notes & Research, §6 Data Model.

## Summary

Standalone notes plus a research library of notes, links, images, and files.

## Requirements
- **Notes:** standalone or organized in (nested) folders; Tiptap content.
- **Research:** items of type NOTE, LINK, IMAGE, FILE, organized in folders.
- Research items can optionally link to a character, place, or scene.
- Image and file uploads via UploadThing.
- Trash and archive supported for notes and research items.

## Data
- `NoteFolder` (self-referencing) / `Note`.
- `ResearchFolder` / `ResearchItem` (`type`, `title`, `content` for NOTE, `url` for LINK/IMAGE/FILE, `description`).

## Routes
- `/projects/[projectId]/notes`
- `/projects/[projectId]/research`
- `/api/uploadthing`

## Acceptance criteria
- Uploads validated for type and size server-side.
- Items scoped by `userId`/`projectId`.

## Open questions
- Is the proposed note/link/image/file model right? (Links to character/place/scene are not yet in the schema.)
