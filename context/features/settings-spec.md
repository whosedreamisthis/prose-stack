# Settings — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Projects & Settings, §6 Data Model (design decisions), §10 UI / UX. Related: [projects-spec.md](projects-spec.md).

## Summary

A per-project settings modal (not a route) for general project details, formatting, theme, and labels.

## Requirements
- Opened from the top navbar settings button; a modal with sections.
- **Save** applies and persists changes; **Reset to default** restores default formatting values.

### General
- Project title (and optionally subtitle, author).

### Appearance
- **Theme:** light or dark. Light by default. Stored per project. Applies immediately on save (and previews live while the modal is open).

### Formatting
- **Font:** font family (curated list, default Georgia).
- **Font size:** 10–18 (default 12).
- **Line spacing:** single / 1.5 / double (default double).
- These apply to the editor and the book view and PDF export.

### Labels
- Add, rename, recolor, and delete labels (name + color).
- Labels are applied to scenes and plot points (see [plot-spec.md](plot-spec.md)).
- Deleting a label clears it from items (`onDelete: SetNull`); confirm first and show how many items use it.
- Names must be unique within a project; color chosen from a preset palette or a color picker.

## Data
- Settings are columns on `Project`: `fontFamily`, `fontSize`, `lineSpacing`, `theme`, with defaults, so "Reset to default" just rewrites defaults. Reset does not touch title or labels.
- `Label` (`projectId`, `name`, `color`).

## State
- Modal open/closed and in-progress edits in Zustand; saved settings come from the server (project loaded in a server component, applied via CSS variables / a theme class).

## Acceptance criteria
- Font size outside 10–18 is rejected client- and server-side (Zod).
- Changing theme, font, size, or spacing updates the editor without a full reload.
- Reset to default restores `Georgia`, 12, double, light.
- Cancel/close without Save discards changes.
- Label add/rename/recolor/delete persist and update everywhere labels appear.
- All writes are scoped by `userId` and `projectId`.

## Open questions
- Is the theme per project (as in the overview) or a per-user app preference?
- Should the modal also hold subtitle/author and cover changes?
- Preset label colors only, or any color?
