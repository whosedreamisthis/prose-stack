# Current Feature: Manuscript Tree: Drag & Drop Reorder

Reorder parts, chapters and scenes by dragging in the tree (dnd-kit). Spec: `context/features/manuscript-tree-dnd-spec.md` (part 3 of 3 of `manuscript-tree-spec.md`; display and add/rename are done).

## Status

In Progress

## Goals

- Drag handle (grip icon) on each part, chapter and scene; keyboard dragging (space to pick up, arrows to move, space to drop); dnd-kit announcements.
- Drop rules: scene on scene (next to it, in that chapter), scene on chapter (end of it), chapter on chapter (reorder), chapter on part (end of it), part on part (reorder); anything else does nothing.
- Optimistic update (`applyMove`), then `moveNode` renumbers the affected sibling groups in one transaction; rollback with a toast on rejection.
- Drag handles labelled ("Reorder Chapter 2").
- Acceptance: reorders persist across reload; no gaps or duplicate positions after cross-chapter moves; failed move restores the tree with an error toast; unit tests cover move planning and drop resolution.

## Notes

- Already built: `planMove`, `applyMove`, `resolveDrop` (`lib/manuscript-tree.ts`, tested) and `moveNode` (`actions/manuscript.ts`, tested); UI wired in `components/manuscript/ManuscriptTree.tsx` with the classic `@dnd-kit/core` + `@dnd-kit/sortable` packages (not `@dnd-kit/react`).
- Decision: dropping into a collapsed parent expands it.
- Out of scope: hover-to-expand while dragging, multi-select.
