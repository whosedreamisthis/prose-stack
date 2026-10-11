# Manuscript Tree: Display & Navigation — Feature Spec

Part 1 of 3, split from [manuscript-tree-spec.md](manuscript-tree-spec.md). Followed by [manuscript-tree-edit-spec.md](manuscript-tree-edit-spec.md) and [manuscript-tree-dnd-spec.md](manuscript-tree-dnd-spec.md).

## Summary

Replace the placeholder in `@left/manuscript/page.tsx` with a read-only, collapsible outline of the manuscript. Writers open scenes from it and see where they are in the book.

## Requirements

- Hierarchy: Book → Part → Chapter → Scene. Chapters may sit directly under the book; parts are optional.
- Load the tree without scene content (`getManuscript`).
- The root row is the book (the project title) with a chevron: collapsing it hides the whole tree. It replaces a separate "Manuscript" header.
- A **Book view** row at the top links to `/projects/[projectId]/manuscript/book`.
- Parts and chapters show a chevron and collapse/expand. Scenes are links to `/projects/[projectId]/manuscript?scene=<id>`.
- The open scene is highlighted. With no `?scene=` (or an unknown id) the first scene in reading order opens (`resolveActiveScene`).
- Collapsed state is per browser session (not saved).
- Long titles truncate with an ellipsis; the full title is a tooltip.
- In the mobile drawer, choosing a scene closes the drawer.
- Projects created before the tree existed get Chapter 1 / Scene 1 the first time the manuscript opens (`seedManuscript`).

## Accessibility

- `role="tree"`, rows `role="treeitem"` with `aria-expanded` (parts and chapters), `aria-current="page"` on the open scene.
- Arrow keys move focus, Left/Right collapse/expand (including the root), Enter opens a scene or toggles a parent.

## Acceptance criteria

- The tree matches the data and nesting order after reload.
- Navigating via the tree changes the editor scene and the highlight.
- Unit tests cover the tree-building and active-scene helpers where they aren't already covered.

## Out of scope

Add, rename, reorder, delete (see the follow-up specs and Trash & Archive).

## Open questions

- Remember collapsed state per project in localStorage?
- Show per-chapter word counts beside titles?
