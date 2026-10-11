# Manuscript Tree: Add & Rename — Feature Spec

Part 2 of 3, split from [manuscript-tree-spec.md](manuscript-tree-spec.md). Depends on [manuscript-tree-display-spec.md](manuscript-tree-display-spec.md).

## Summary

Let writers add scenes, chapters and parts and rename any item from the tree. Uses the existing `createNode` and `renameNode` actions.

## Requirements

### Add
- An **Add scene** button at the end of each chapter's children.
- The header **Add** menu creates a part or a chapter at the end of the book.
- Each part has an **Add chapter** button at the end of its children.
- Titles are numbered per sibling group ("Chapter 3", "Scene 2"); new items go at the end of their parent.
- A new item is selected: a new scene opens in the editor; a new chapter or part starts renaming immediately.
- The server enforces the hierarchy whatever the client sends.

### Rename
- Double-click an item (or press **F2**) to edit its title in place. **Enter** or blur saves, **Escape** cancels.
- Empty or over-120-character titles are rejected with a toast and the old title stays.
- Renaming is optimistic and rolls back if the server rejects it.

## Accessibility

- Add buttons have labels ("Add scene to Chapter 2").
- The rename input is labelled and focused on entry; focus returns to the row on exit.

## Acceptance criteria

- Add and rename persist across reload.
- Failed server calls leave the tree as it was, with an error toast.
- Concurrent adds don't produce duplicate positions (project row lock).
- Action tests cover auth, validation and not-found cases for `createNode` and `renameNode`.

## Out of scope

Deleting items (Trash & Archive), reordering (next spec).
