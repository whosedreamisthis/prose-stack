# Notes & Research — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Notes & Research, §6 Data Model.

## Summary

Standalone notes plus a research library of notes, links, images, and files.

## Requirements
- **Notes:** standalone or organized in (nested) folders; Tiptap content.
- **Research:** items of type NOTE, LINK, IMAGE, FILE, organized in (nested) folders. Items can be created inside a folder, moved between folders (drag and drop or "Move to…"), and folders can be renamed, nested, trashed, and archived.
- **Worldbuilding:** no separate sidebar section. Worldbuilding is covered by research folders. New projects offer optional starter folders (e.g. Magic & Technology, Cultures, History, Geography, Politics) which are ordinary, deletable folders. Places remain the structured home for settings.
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
