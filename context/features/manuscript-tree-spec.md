# Manuscript Tree — Feature Spec

Source: [manuscript-spec.md](manuscript-spec.md) (Tree), [sidebars-layout-spec.md](sidebars-layout-spec.md). The tree lives in the left sidebar (`@left/manuscript` parallel route) and is the only place that shows where a scene sits in the book.

## Summary

A collapsible outline of the manuscript in the left sidebar. Writers open scenes from it, rename items in place, add scenes and chapters, and reorder everything by dragging.

## Structure

- The project is the book (the tree's root). Hierarchy: **Book → Part → Chapter → Scene**. Chapters may sit directly under the book; parts are optional.
- Allowed children: book → part, chapter; part → chapter; chapter → scene; scene → nothing.
- Siblings are ordered by an integer `position` (0-based, no gaps).
- Defaults when creating: titles are numbered per sibling group ("Chapter 3", "Scene 2"). New items go at the end of their parent.
- Projects created before the tree existed get Chapter 1 / Scene 1 the first time the manuscript opens. New projects are seeded at creation.

## Requirements

### Display
- Header row: "Manuscript" title and an **Add** menu (Part, Chapter).
- A **Book view** row at the top of the tree links to `/projects/[projectId]/manuscript/book`.
- Parts and chapters show a chevron and collapse/expand; scenes are links to `/projects/[projectId]/manuscript?scene=<id>`.
- The open scene is highlighted. With no `?scene=` (or an unknown id) the first scene in reading order opens.
- Collapsed state is per browser session (not saved).
- Long titles truncate with an ellipsis; the full title is available as a tooltip.
- In the mobile drawer, choosing a scene closes the drawer.

### Rename
- Double-click an item to edit its title in place. **Enter** or blur saves, **Escape** cancels.
- Empty or over-120-character titles are rejected with a toast and the old title stays.
- Renaming is optimistic and rolls back if the server rejects it.

### Add
- An **Add scene** button sits at the end of each chapter's children.
- The header **Add** menu creates a part or a chapter at the end of the book.
- Each part has an **Add chapter** button at the end of its children.
- A new item is selected: a new scene opens in the editor, and a new chapter or part starts renaming immediately.

### Reorder (dnd-kit)
- Each row has a drag handle (grip icon); dragging by the handle avoids clashing with click and double-click. Keyboard dragging works (space to pick up, arrows to move, space to drop).
- Drop rules:
  - Scene on a scene: moves next to it, in that scene's chapter (this moves scenes between chapters).
  - Scene on a chapter: moves to the end of that chapter, which is how a scene enters an empty chapter.
  - Chapter on a chapter: reorders among that chapter's siblings.
  - Chapter on a part: moves to the end of that part.
  - Part on a part: reorders parts.
  - Anything else does nothing.
- The tree updates immediately; the server then renumbers the affected sibling groups in **one transaction**. If the server rejects the move, the tree rolls back and a toast explains.
- A dragged item can never end up somewhere the hierarchy forbids.

### Out of scope
- Deleting items (arrives with Trash & Archive).
- Dragging an item into a collapsed parent by hovering (the drop rules above cover moving between parents).
- Multi-select.

## Data

- `ManuscriptNode`: `id`, `projectId`, `parentId`, `type` (PART | CHAPTER | SCENE), `title`, `position`; scenes also hold `content`, `summary`, `wordCount`, `labelId`.
- Index on `(projectId, parentId, position)`.
- The tree is loaded without scene content (the sidebar never needs it).

## Server actions (`actions/manuscript.ts`)

- `createNode({ projectId, parentId, type })`: validates the hierarchy, appends, returns the new id.
- `renameNode({ projectId, nodeId, title })`.
- `moveNode({ projectId, nodeId, parentId, index })`: plans the move, rewrites positions for every affected node in one transaction, closes the gap in the old parent.
- All actions check the signed-in user owns the project, validate input with Zod, and return `{ success, data, error }`.
- Tree edits lock the project row so two concurrent edits cannot produce duplicate positions.
- Hierarchy and move planning are pure helpers (`lib/manuscript-config.ts`, `lib/manuscript-tree.ts`) shared by the client (optimistic updates) and the server (authority).

## Accessibility

- The tree uses `role="tree"`, rows `role="treeitem"` with `aria-expanded` (parts and chapters) and `aria-current="page"` on the open scene.
- Drag handles have labels ("Reorder Chapter 2"); dnd-kit announcements are enabled.
- Every action is reachable by keyboard: arrow keys move focus, Enter opens, F2 renames.

## Acceptance criteria

- Hierarchy rules are enforced server-side, whatever the client sends.
- Rename, add and reorder persist across reload.
- Moving a scene to another chapter leaves no gaps or duplicate positions in either chapter.
- A failed server call leaves the tree as it was, with an error toast.
- Unit tests cover: hierarchy rules, move planning (reorder, cross-parent move, clamping, rejection), drop resolution, and each action's auth, validation and not-found cases.

## Open questions

- Should collapsed state be remembered per project in localStorage?
- Show per-chapter word counts beside titles?
- Should dropping a scene on a collapsed chapter expand it?
