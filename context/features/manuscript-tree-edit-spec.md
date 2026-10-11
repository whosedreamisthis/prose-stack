# Manuscript Tree: Add & Rename — Feature Spec

Part 2 of 3, split from [manuscript-tree-spec.md](manuscript-tree-spec.md). Depends on [manuscript-tree-display-spec.md](manuscript-tree-display-spec.md).

## Summary

Let writers add scenes, chapters and parts and rename any item from the tree. Uses the existing `createNode` and `renameNode` actions.

## Requirements

### Row menus
- Every row has a "…" button on its right, visible only while the row is hovered or focused (or its menu is open).
- Book: Add part, Add chapter, Expand all, Collapse all.
- Part: Add chapter, Rename.
- Chapter: Add scene, Rename.
- Scene: Rename. More options (move, delete, label) arrive with later features.
- Closing a menu does not return focus to its button, so a rename started from the menu keeps focus in its input.

### Add
- Add is done from the row menus above. Each part also keeps an **Add chapter** row at the end of its children; chapters have no add button at the bottom.
- Titles are numbered per sibling group ("Chapter 3", "Scene 2"); new items go at the end of their parent.
- Every new item starts in rename mode with its title selected and focused; a new scene also opens in the editor.
- The server enforces the hierarchy whatever the client sends.

### Rename
- Double-click an item (or press **F2**) to edit its title in place. **Enter** or blur saves, **Escape** cancels.
- Empty or over-120-character titles are rejected with a toast and the old title stays.
- Renaming is optimistic and rolls back if the server rejects it.

## Accessibility

- Row menu buttons are labelled ("Chapter 2 options") and reachable by keyboard.
- The rename input is labelled and focused on entry; focus returns to the row on exit.

## Acceptance criteria

- Add and rename persist across reload.
- Failed server calls leave the tree as it was, with an error toast.
- Concurrent adds don't produce duplicate positions (project row lock).
- Action tests cover auth, validation and not-found cases for `createNode` and `renameNode`.

## Out of scope

Deleting items (Trash & Archive), reordering (next spec).
