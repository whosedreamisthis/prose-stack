# Current Feature: Manuscript Tree: Display & Navigation

Replace the placeholder in `@left/manuscript/page.tsx` with a read-only, collapsible outline of the manuscript. Spec: `context/features/manuscript-tree-display-spec.md` (part 1 of 3 of `manuscript-tree-spec.md`; followed by `manuscript-tree-edit-spec.md` and `manuscript-tree-dnd-spec.md`).

## Status

Not Started

## Goals

- Hierarchy: Book → Part → Chapter → Scene (chapters may sit directly under the book; parts optional).
- Load the tree without scene content (`getManuscript`).
- The root row is the book (the project title) with a chevron: collapsing it hides the whole tree. It replaces a separate "Manuscript" header.
- "Book view" row at the top links to `/projects/[projectId]/manuscript/book`.
- Parts and chapters have a chevron and collapse/expand; scenes link to `/projects/[projectId]/manuscript?scene=<id>`.
- Highlight the open scene; with no `?scene=` (or an unknown id) the first scene in reading order opens (`resolveActiveScene`).
- Collapsed state is per browser session (not saved).
- Long titles truncate with an ellipsis; full title as tooltip.
- In the mobile drawer, choosing a scene closes the drawer.
- Older projects get Chapter 1 / Scene 1 the first time the manuscript opens (`seedManuscript`).
- Accessibility: `role="tree"`, rows `role="treeitem"` with `aria-expanded` (parts/chapters), `aria-current="page"` on the open scene; arrow keys move focus, Left/Right collapse/expand (including the root), Enter opens a scene or toggles a parent.
- Acceptance: tree matches data and nesting after reload; navigating via the tree changes the editor scene and highlight; unit tests for any new tree-building/active-scene helpers.

## Notes

- Already built: `actions/manuscript.ts` (createNode, renameNode, moveNode), `lib/manuscript-tree.ts` (planMove, applyMove, resolveActiveScene, resolveDrop), `lib/manuscript.ts` (getManuscript, seedManuscript), dnd-kit packages installed.
- Out of scope: add, rename, reorder, delete (follow-up specs; delete arrives with Trash & Archive).
- Open questions: remember collapsed state per project in localStorage? Per-chapter word counts?
- Parent feature "Manuscript" (editor, autosave, book view) remains tracked in `context/features/manuscript-spec.md`.
