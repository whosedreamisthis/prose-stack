# Manuscript Tree: Drag & Drop Reorder — Feature Spec

Part 3 of 3, split from [manuscript-tree-spec.md](manuscript-tree-spec.md). Depends on the display spec; best built after add/rename.

## Summary

Reorder parts, chapters and scenes by dragging in the tree (dnd-kit). The planning logic (`planMove`, `applyMove`, `resolveDrop`) and `moveNode` already exist; this feature is the UI plus any gaps found in them.

## Requirements

- Each part, chapter and scene has a drag handle (grip icon) at its left, visible on hover or focus. Dragging by the handle avoids clashing with click and double-click. The book row cannot be dragged. While dragging, a floating chip shows the item and the valid drop target gets a ring.
- Keyboard dragging works: space to pick up, arrows to move, space to drop. dnd-kit announcements are enabled.
- Drop rules:
  - Scene on a scene: moves next to it, in that scene's chapter (this moves scenes between chapters).
  - Scene on a chapter: moves to the end of that chapter (how a scene enters an empty chapter).
  - Chapter on a chapter: reorders among that chapter's siblings.
  - Chapter on a part: moves to the end of that part.
  - Part on a part: reorders parts.
  - Anything else does nothing; the hierarchy can never be violated.
- The tree updates immediately (`applyMove`); the server then renumbers the affected sibling groups in one transaction.
- If the server rejects the move, the tree rolls back and a toast explains.
- Drag handles have labels ("Reorder Chapter 2").

## Acceptance criteria

- Reorders persist across reload.
- Moving a scene to another chapter leaves no gaps or duplicate positions in either chapter.
- A failed move restores the previous tree with an error toast.
- Unit tests cover move planning (reorder, cross-parent, clamping, rejection) and drop resolution.

## Out of scope

Dragging into a collapsed parent by hovering, multi-select.

## Open questions

- Decided: a drop opens its destination parent if it was collapsed, so the moved item stays visible.
