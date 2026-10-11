# Current Feature: Manuscript Tree

The collapsible manuscript outline in the left sidebar: display and navigation, add and rename, and drag-and-drop reorder. Specs: `context/features/manuscript-tree-display-spec.md`, `manuscript-tree-edit-spec.md`, `manuscript-tree-dnd-spec.md` (split from `manuscript-tree-spec.md`).

## Status

In Progress

## Goals

- Display: book (project title) as the root row, then parts, chapters and scenes; collapsible; scenes link to `?scene=<id>` and the open scene is highlighted; Book view link; type icons that swap to a chevron on hover; mobile drawer closes on choosing a scene; older projects seeded with Chapter 1 / Scene 1.
- Add and rename: hover "…" menus (book: add part/chapter, expand/collapse all; part: add chapter; chapter: add scene; all: rename and a disabled "Move to trash" placeholder); every new item starts in rename mode; double-click or F2 renames; optimistic with rollback.
- Drag and drop (dnd-kit): grip handle on each part, chapter and scene; keyboard dragging with announcements; drop rules enforced by `resolveDrop`/`planMove`; dropping a chapter or part on the book row moves it to the end of the book (the way out of a part); optimistic move with rollback and a toast; the moved item keeps focus.
- Accessibility: `role="tree"` with named treeitems, `aria-expanded`, `aria-owns` for groups, `aria-current` on the open scene, arrow-key navigation.
- Acceptance: tree matches the data after reload; add, rename and reorder persist; failed server calls roll back with a toast; unit tests cover hierarchy, move planning, drop resolution and the actions.

## Notes

- Code: `components/manuscript/` (`ManuscriptTree`, `TreeRow`, `RowMenu`, `TitleEditor`, `useTreeDnd`, `tree-keyboard`, `tree-config`), `lib/manuscript-tree.ts`, `lib/stores/tree-store.ts`, `actions/manuscript.ts`.
- The sidebar slot has its own `<Suspense>` boundary (the layout's boundary is not enough for Next.js's instant-navigation check).
- Known gaps: the Book view link 404s until the book view exists; three tab stops per row (no roving tabindex); scenes do not open an editor yet (next feature: scene editor).
- Parent feature "Manuscript" (editor, autosave, book view) stays tracked in `context/features/manuscript-spec.md`.
