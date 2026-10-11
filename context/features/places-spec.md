# Places — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Places, §6 Data Model.

## Summary

Place cards that capture the settings of the novel.

## Requirements
- Sketch fields: name, location, role, related characters, season, unique features, description, sights, sounds, smell, notes.
- Link a place to one or more characters.
- Create, edit, trash, and archive places.

## Data
- `Place` (`name`, `location`, `roleInStory`, `season`, `uniqueFeatures`, `description`, `sights`, `sounds`, `smell`, `notes`, `trashedAt`, `archivedAt`).
- `relatedCharacters` many-to-many with `Character`.

## Routes
- `/projects/[projectId]/places`

## Acceptance criteria
- Related-character links persist and update when a character is trashed or deleted.
- Scoped by `userId`/`projectId`; input validated with Zod.
