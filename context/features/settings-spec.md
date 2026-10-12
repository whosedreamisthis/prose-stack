# Settings (UI) — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Projects & Settings, §10 UI / UX. Related: [projects-spec.md](projects-spec.md).

The settings are split into four specs. This one is the modal and its tabs; what each tab holds is specified separately:

| Tab | Spec |
| --- | --- |
| General | this spec (below) |
| Appearance | [settings-theme-spec.md](settings-theme-spec.md) |
| Formatting | [settings-formatting-spec.md](settings-formatting-spec.md) |
| Labels | [settings-labels-spec.md](settings-labels-spec.md) |

## Summary

A project settings modal (not a route) with a tab per area. It is the one place to change a project's details, how it looks, how the manuscript is formatted and the labels used on scenes and plot points.

## Requirements
- Opened from the **Settings** button in the top navbar (project pages only). It replaces the disabled placeholder.
- A modal dialog with a tab list and the active tab's panel: **General**, **Appearance**, **Formatting**, **Labels**, in that order.
  - From `md` up the tabs are a vertical list on the left and the panel fills the rest; below `md` the tabs are a horizontal row above the panel that scrolls sideways if it does not fit.
  - The dialog keeps a fixed height with the panel scrolling inside it, so switching tabs never resizes the dialog.
- The tabs are `role="tablist"` with roving focus (arrow keys move, Home and End jump), the panel is `role="tabpanel"` labelled by its tab, and the dialog traps focus, closes on Escape and returns focus to the Settings button.
- The footer has **Save**, **Cancel** and **Reset to default**:
  - **Save** persists every changed setting in one request and closes the modal. It is disabled while nothing has changed.
  - **Cancel**, the close button, Escape and clicking outside discard unsaved edits. If there are any, ask first ("Discard your changes?").
  - **Reset to default** resets only the tab that is open, and only after confirming. It sets the draft; the writer still presses Save. It does not exist on General or Labels (nothing has a default there).
- The tab strip marks a tab that has unsaved changes with a dot.
- **Labels apply immediately** (each add, rename, recolor and delete is saved as it happens, like notes), so that tab shows a note saying so and Save and Cancel do not affect it. The footer buttons stay but only act on the other tabs.

### General tab
- **Title** (required, up to 120 characters), **Subtitle** (optional, up to 160) and **Author** (required, up to 80), the same rules as when a project is created.
- Cover design and color stay where they are today (project creation); changing them here is out of scope for now.

## State
- The modal's open state, the active tab and the unsaved draft live in a Zustand store (`lib/stores/settings-store.ts`). Saved values come from the server (the project is already loaded for the page) and the draft starts as a copy of them each time the modal opens.
- Theme and formatting changes preview live while the modal is open by writing the draft to the same CSS variables the app already uses; Cancel restores the saved ones.

## Server
- One server action, `updateProjectSettings`, takes only the fields that changed across General, Appearance (if per project) and Formatting, validates them with the schemas from each tab's spec, and updates the project in one write scoped by `userId` and `projectId`. Labels have their own actions (see the labels spec).
- It expires the cached project read (the `project` tag) so every page and the navbar switcher show the new values.

## Acceptance criteria
- The modal opens from the navbar on every project page and returns focus on close.
- Save is disabled until something changes; saving closes the modal and the changes show without a reload.
- Cancel or Escape with unsaved edits asks before discarding; without edits it closes at once.
- Reset to default affects only the open tab and needs Save to persist.
- Switching tabs keeps edits made in other tabs.
- Tabs are fully keyboard-operable and the dialog is usable at phone width.
- Every write is scoped by `userId` and `projectId` and validated with Zod.

## Open questions
- Should a settings tab be deep-linkable (for example `?settings=formatting`) so other places can open the modal on a given tab?
- Should the modal also hold the cover design and color?
