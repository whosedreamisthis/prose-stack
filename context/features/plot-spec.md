# Plot — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Plot, §6 Data Model, §10 UI/UX.

## Summary

Plan the story with plot points, scene cards, and a plot lines grid that links planning to scenes.

## Requirements
- **Plot points:** draggable index cards with optional labels.
- **Scenes:** cards with summary, label, and an ellipsis menu (send to trash).
- **Plot lines grid:** scenes down the left, plot lines across; adding a plot point on a scene's row links it to that scene.
- Scene editor right sidebar shows and edits the plot points linked to the scene.
- Drag and drop via dnd-kit; ordering by `position`.
- Labels (name + color) applied to scenes and plot points.

## Data
- `PlotLine` → `PlotPoint` (ordered).
- `PlotPoint.sceneId` is optional and **unique**: a scene has at most one plot point, and a plot point links to at most one scene.
- `Label` (name, color).

## Routes
- `/projects/[projectId]/plot`

## Acceptance criteria
- Reordering persists in one transaction.
- Linking/unlinking a plot point updates both the grid and the scene sidebar.
- Trashing a scene sets `sceneId` to null on its plot point (`onDelete: SetNull`).
- Plot board state managed with Zustand.
