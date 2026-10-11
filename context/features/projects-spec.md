# Projects — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Projects & Settings, §5 Architecture, §8 Routes. Related: [settings-spec.md](settings-spec.md).

## Summary

Create, save, open, and switch between multiple books (projects) per user.

## Requirements

### Create
- **New project** from the projects page and from the project switcher.
- Create flow: pick a cover design and color (live recolor) or upload a cover image; enter author, title, subtitle. Title and author are required.
- Cover uploads go through UploadThing.
- On create, seed Chapter 1 / Scene 1 ("Once upon a time...") and default settings, then open the new project in the manuscript.

### Save
- Everything saves automatically; there is no manual "save project" step.
- Manuscript content uses debounced autosave (see [manuscript-spec.md](manuscript-spec.md)); other edits (characters, places, plot, notes) save on change or blur through Server Actions.
- Project details and settings save via the settings modal Save button (see [settings-spec.md](settings-spec.md)).

### Open and switch
- `/projects` lists the user's projects as cover cards (cover, title, author, last edited, word count), most recently edited first. Click to open.
- **Project switcher** in the top navbar: dropdown of projects plus "New project" and "All projects".
- Opening a project goes to `/projects/[projectId]/manuscript`. The last-opened project is remembered so sign-in lands on it (or on `/projects`; see open questions).
- Active project held in the Zustand store; the route `projectId` is the source of truth.

### Edit and remove (proposed)
- Edit title, subtitle, author, and cover from the settings modal or a card menu.
- **Delete project** from a card menu, with a confirmation that names the project. The overview does not define project-level trash; proposed: permanent delete with confirmation (cascades to all data and uploaded files).

## Data
- `Project` (`title`, `subtitle`, `author`, `coverDesign`, `coverColor`, `coverImageUrl`, `createdAt`, `updatedAt`). `updatedAt` drives "last edited".
- Word count per project is the sum of its scenes' `wordCount`.

## Routes
- `/projects`
- `/projects/[projectId]/manuscript`

## Acceptance criteria
- Every project query is scoped by the signed-in user's `userId`; opening another user's `projectId` returns 404.
- Creating a project is validated with Zod server-side (title and author required, length limits).
- A new project appears in the switcher and list immediately and opens with the seeded scene.
- Switching projects never shows data from the previous project.
- Deleting a project removes its rows and uploaded files, and the user is returned to `/projects`.
- Demo users can create and open projects but are limited as in [demo-spec.md](demo-spec.md).

## Open questions
- Delete project: permanent with confirmation, or move to trash first?
- Should there be a limit on projects per user (relevant to future monetization)?
- After sign-in, land on `/projects` or the last-opened project?
