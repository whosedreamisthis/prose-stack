# Scene Sidebar (Right Sidebar) — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Plot, §10 Layout, §6 Data Model.

## Summary

A right-hand panel in the scene editor showing planning material for the scene being written.

## Requirements (in the overview)
- Shows and edits the **plot points linked to the scene** (one-to-one: `PlotPoint.sceneId`).
- Shows the scene's summary and label.
- Collapsible.

## Proposed additions (NOT in the overview — need a decision)
- **Scene goal:** short text for what the scene must accomplish.
- **Scene notes:** free-text notes per scene.
- Optional: characters and place appearing in the scene.

These need new fields (e.g. `goal`, `notes` on `ManuscriptNode`, or a `SceneNote` model) and a migration via `prisma migrate dev`. Do not apply with `db push`.

## Acceptance criteria
- Editing a plot point in the sidebar updates the plot grid and cards.
- Sidebar edits autosave with the same debounce as the editor.
- Switching scenes swaps the sidebar content without a full reload.

## Open questions
- Add scene goals and notes? Plain text or rich text?
- Link characters/places to scenes?
