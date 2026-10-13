# Settings: Labels — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Projects & Settings, §6 Data Model. Part of the settings modal: [settings-spec.md](settings-spec.md) (the **Labels** tab). Related: [plot-spec.md](plot-spec.md).

## Summary

Labels are named colors a writer attaches to scenes and plot points to mark things like a draft stage or a storyline. This tab is where they are created and managed; applying them happens on the scene sidebar and the plot cards.

## Requirements
- A **Labels** tab listing the project's labels, each with a color swatch, its name, and how many scenes and plot points use it.
- **Add:** a "New label" row at the bottom opens an inline name field and a color choice; Enter or the check button saves, Escape cancels.
- **Rename:** click the name to edit it in place; Enter saves, Escape cancels.
- **Recolor:** the swatch opens a small picker with a preset palette and a custom color input. The presets are colors that read on both the light and dark themes; a custom color is checked for contrast and the writer is warned (not blocked) if it is too close to the background.
- **Delete:** a trash button per label with a confirmation that states how many scenes and plot points use it ("Used by 4 scenes and 2 plot points. They will be unlabeled."). Deleting clears the label from those items (`onDelete: SetNull`); it does not delete the items.
- Names are unique within a project, compared ignoring case, trimmed, 1 to 40 characters. A duplicate shows an inline error.
- A project has at most 20 labels.
- **Labels save immediately**, each change on its own, not through the modal's Save button. The tab says so, and the footer's Save and Cancel do not affect it. A failed change rolls back with an error toast.
- Wherever labels appear (the scene sidebar's label picker, scene and plot cards, the plot filter), they show the same swatch and name, and update as soon as a label changes here (cache tags expire on every write).

## Data
- `Label` (`id`, `projectId`, `name`, `color`, `createdAt`), `@@unique([projectId, name])` on a case-folded name (stored in a `nameKey` column or enforced with a lower-case index), `onDelete: Cascade` from `Project`.
- `ManuscriptNode.labelId` already exists as a plain column; it becomes a relation to `Label` with `onDelete: SetNull`. Plot points get `labelId` the same way when that feature exists.
- Color stored as a `#rrggbb` string, validated by regex.

## Server
- `actions/labels.ts`: `createLabel`, `renameLabel`, `recolorLabel`, `deleteLabel`, each Zod-validated and scoped by `userId` and `projectId`; deleting also expires the scenes and plot reads that show the label.
- `lib/labels.ts`: a cached `listLabels` with usage counts, tagged `labels:<projectId>` (new `cacheTags.labels`) and `project:<projectId>`.
- Applying a label to a scene or plot point belongs to those features; this spec only provides the labels and the guarantee that a deleted one is cleared.

## Where labels show
- **Left sidebar (manuscript tree):** a scene's, chapter's or part's label appears as a small vertical color bar at the right edge of its row, after the title (see the reference screenshot: gold and red bars beside scene rows). The label name is available as a tooltip and `aria-label`, so color is never the only cue.
- **Right sidebar (plot cards):** once plots are implemented, a plot point's label appears on its card as a colored chip with a bookmark icon and the label name (for example "test label 2"), at the bottom-left of the card.
- Both places read the same label color and name, and update as soon as a label changes.

## Demo seed
- Once labels are implemented, seed the demo user with some labels (for example "Draft", "Revise", "Final", each with a distinct color) and label some demo scenes, chapters and parts with them, per the convention that features adding user data also seed the demo user. When plots are implemented, also label some demo plot points. Test it in `lib/demo-seed.test.ts`.

## Acceptance criteria
- Add, rename, recolor and delete each persist and show everywhere labels appear without a reload.
- A duplicate or blank name, a bad color, or a twenty-first label is rejected on the client and the server.
- Deleting a label that is in use asks first, shows the counts, unlabels the items and keeps them.
- A label of another project, or another user's, can never be read, edited or applied.
- A labeled scene, chapter or part shows its color bar in the left sidebar, and a labeled plot point shows its label chip on the right sidebar card.
- The demo user is seeded with labels applied to some items.
- The tab is keyboard-operable and every swatch has a text name (color is never the only cue).

## Open questions
- Preset colors only, or any color? (This spec allows a custom color with a contrast warning.)
- Can a scene carry more than one label, or exactly one (current model: one)?
- Should labels be reorderable, or always alphabetical?
