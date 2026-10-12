# Plot — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Plot, §6 Data Model, §10 UI/UX.

## Summary

Plan the story with plot points, scene cards, and a plot lines grid that links planning to scenes.

## Requirements
- **Plot points:** draggable index cards with optional labels.
- **Scenes:** cards with summary, label, and an ellipsis menu (send to trash).
- **Plot lines grid:** scenes down the left (in manuscript order), plot lines across. A plot point is a cell where a scene's row meets a plot line, so **every plot point belongs to exactly one scene**; there are no loose or unlinked plot points. Adding a point on a scene's row puts it in that scene.
- **Planning before writing:** the grid's add-point control on an empty row can also create the scene. A new row adds a scene with a default title to the end of the manuscript outline, so planning and outlining are one act. With no scenes at all, the grid shows an empty state with an "Add scene" action.
- Scene editor right sidebar shows the plot points of the scene (at most one per plot line) as compact cards, each with its plot line's name, implemented like the sidebar notes (`NotesList`): clicking a card, or its add button, opens a modal to edit the plot point (title/text, label, plot line, and the scene it belongs to, which can be changed but never left empty) rather than editing inline. The card shows the text and, if set, the label chip (see [settings-labels-spec.md](settings-labels-spec.md)).
- **Grid icon in the scene sidebar:** the Plots tab of the scene's right sidebar has a grid icon button (tooltip "Open plot grid") that opens the plot grid at `/projects/[projectId]/plot`.
- **Plots section in the left sidebar:** a collapsible **Plots** section like Characters and Places. Its first row is **Plot grid**, which opens the grid; under it is one row per plot line, in order. Clicking a plot line opens the grid focused on that line (`?line=<id>`). The open grid or line is highlighted like the selected scene.
- **Adding plot lines:** the writer adds plot lines from the grid (an "Add plot line" column at the end of the grid header). The new line appears at once in the grid and in the left sidebar. Lines can be renamed, reordered and trashed from either place (row menu in the sidebar, column header menu in the grid).
- Drag and drop via dnd-kit; ordering by `position`.
- Labels (name + color) applied to scenes and plot points.

## Data
- `PlotLine` → `PlotPoint` (ordered by `position`).
- `PlotPoint.sceneId` is **required**, `onDelete: Cascade` from the scene. `@@unique([plotLineId, sceneId])`: a scene has at most one plot point per plot line, and a point belongs to one scene.
- `PlotPoint.labelId` optional, `onDelete: SetNull` (see [settings-labels-spec.md](settings-labels-spec.md)).
- `PlotPoint.trashedAt` and `PlotLine.trashedAt`, like notes: trashing a scene trashes its plot points with it, restoring the scene restores them, and deleting the scene permanently deletes them. Trashed points and lines appear in Trash and can be restored or deleted there (new trash kinds).
- `Label` (name, color).

## Demo seed
- Seed the demo user with two or three plot lines and plot points on several demo scenes (some with labels), per the convention that features adding user data also seed the demo user. Test it in `lib/demo-seed.test.ts`.

## Routes
- `/projects/[projectId]/plot` (optional `?line=<plotLineId>` focuses one plot line)

## Acceptance criteria
- Clicking a plot point in the right sidebar opens an edit modal, behaving like the notes modal; changes save and the card updates without a reload.
- The grid icon in the scene sidebar's Plots tab opens the plot grid.
- The left sidebar has a Plots section with the plot grid row and one row per plot line; clicking a line opens the grid focused on it, and the selected row is highlighted.
- Adding a plot line in the grid shows it in the left sidebar immediately, with no reload.
- Reordering persists in one transaction.
- Moving a plot point to another scene (by dragging in the grid or in the edit modal) updates both the grid and the scene sidebars.
- A plot point can never exist without a scene; creating one on an empty row creates the scene too.
- Trashing a scene trashes its plot points; restoring it restores them; deleting it permanently deletes them.
- A scene cannot get two plot points on the same plot line.
- Plot board state managed with Zustand.
