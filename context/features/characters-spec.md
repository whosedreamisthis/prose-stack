# Characters — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Characters, §6 Data Model.

## Summary

A sketch document per character, split into Main and Supporting.

## Requirements
- Sketch fields: name, age, location, role, goal, appearance, personality, occupation, habits, background, internal conflicts, external conflicts, notes.
- Characters grouped into **Main** and **Supporting** (`CharacterRole`).
- Create, edit, trash, and archive characters.
- Select a character from the left sidebar list.

## Data
- `Character` (`role`, `name`, `age`, `location`, `roleInStory`, `goal`, `physicalDescription`, `personality`, `occupation`, `habits`, `background`, `internalConflicts`, `externalConflicts`, `notes`, `trashedAt`, `archivedAt`).
- Related to `Place` via `PlaceCharacters`.

## Routes
- `/projects/[projectId]/characters`

## Acceptance criteria
- All queries scoped by `userId` and `projectId`.
- Input validated with Zod on the server.
- Trashed/archived characters disappear from the list and appear in Trash/Archive.
