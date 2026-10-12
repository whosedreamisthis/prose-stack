# Research — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Notes & Research, §6 Data Model. Related: [research-uploads-spec.md](research-uploads-spec.md) (Part 2: images and files), [places-spec.md](places-spec.md), [trash-archive-spec.md](trash-archive-spec.md), [demo-spec.md](demo-spec.md).

## Summary

A research library per project: notes and links, organized in nested folders, optionally linked to a character, place or scene. It sits in the left sidebar under Places, in a section headed **Research**. Image and file uploads follow in [research-uploads-spec.md](research-uploads-spec.md).

## Decisions

- **No separate Notes section.** A research item of type NOTE is a standalone note, and manuscript-wide notes already exist (`ProjectNote`, right sidebar of the full manuscript). The overview's `NoteFolder` / `Note` models are dropped.
- **Worldbuilding** is covered by research folders (no own section). A new project gets no folders by default; an empty Research section offers **Add starter folders** (Magic & Technology, Cultures, History, Geography, Politics), which creates ordinary, deletable folders. The demo seed gets them.

## Requirements

### Sidebar (left)
- A **Research** section after Places, before Archive, with a `+` action like Places (`SidebarSection slug="research"`, action button) that adds a NOTE at the top level.
- The section shows a tree, like the manuscript outline: folders (collapsible, folder icon) and items (icon by type: note, link). Rows open the item; a folder row toggles.
- Row menu on a folder: Add note, Add link, Add folder, Rename, Move to…, Archive, Trash.
- Row menu on an item: Rename, Move to…, Link to… (character, place or scene), Export as PDF (NOTE only), Archive, Trash.
- Drag and drop to reorder and to move items or folders into another folder (dnd-kit, same feel as the outline). A folder cannot be dropped into itself or its descendants. Folders nest up to 4 levels.
- Clicking a row highlights it optimistically and shows a skeleton while the page loads, like the other sections.

### Main pane (`/projects/[projectId]/research?item=<id>`)
- **NOTE:** title plus a Tiptap editor (same extensions and project formatting as the scene editor) with debounced autosave and a save status. No toolbar tools in this version.
- **LINK:** title, URL (validated, `http(s)` only), description; an "Open link" button opening in a new tab with `rel="noopener noreferrer"`. No server-side fetching of the page (no previews), so no SSRF surface.
- No item selected: an empty state with "Add note" / "Add link" buttons, plus "Add starter folders" when the project has no research yet.

### Links to the story
- An item can link to **one** character, place **or** scene (optional). Shown as a chip under the title that opens it; set or cleared from "Link to…" or a picker in the item pane.
- If the linked thing is deleted the link is cleared (`onDelete: SetNull`); a trashed or archived target just hides the chip until it is restored.
- Not in this version: research shown on the character, place or scene panels (see Later).

### Trash and archive
- Items and folders can be trashed and archived, and appear on the Trash and Archive pages with the existing restore / delete forever actions.
- Trashing or archiving a folder hides it and everything inside it together (same timestamp, like manuscript nodes); restoring brings them all back. Deleting forever removes the folder and its contents.

### Limits
- 500 research items and 100 folders per project; title and folder name up to 120 characters; URL up to 2,048; description up to 2,000; note content uses the scene editor's size limit.

## Data

```prisma
enum ResearchType { NOTE LINK IMAGE FILE } // IMAGE and FILE are used from Part 2

model ResearchFolder {
  id         String    @id @default(cuid())
  projectId  String
  parentId   String?   // null = top level
  name       String
  position   Int       // order among sibling folders, 0-based; folders list before items
  trashedAt  DateTime? // set on the folder and everything under it together
  archivedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  // relations: project (Cascade), parent/children (self, Cascade)
  @@index([projectId, parentId, position])
}

model ResearchItem {
  id          String       @id @default(cuid())
  projectId   String
  folderId    String?      // null = top level
  type        ResearchType
  title       String
  content     Json?        // NOTE: Tiptap document
  url         String?      // LINK: the address
  description String?
  position    Int          // order among sibling items, 0-based
  characterId String?      // at most one of these three is set
  placeId     String?
  sceneId     String?      // a ManuscriptNode of type SCENE
  trashedAt   DateTime?
  archivedAt  DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  // relations: project (Cascade), folder (Cascade), character/place/scene (SetNull)
  @@index([projectId, folderId, position])
}
```

- Reads in `lib/research.ts` use tagged `use cache`, expired by `updateTag` in `actions/research.ts` (new tags in `lib/cache-tags.ts`).
- Trash and Archive listings (`lib/trash.ts`) and their actions learn the two new kinds; `components/trash/kind-icons.ts` gets icons.

## Routes
- `/projects/[projectId]/research` (with `?item=`)
- `@right/research/page.tsx` returns `null` (no right panel), so the previous panel does not linger.
- `/api/export/research/[id]` for NOTE items, through the existing export route.

## Demo seed
- Starter folders plus a few items: two notes (e.g. lighthouse history, the Fresnel lens), one link, one note linked to a character and one to a place.

## Acceptance criteria
- Every action checks the user owns the project, validates input with Zod, and scopes reads and writes by `userId`/`projectId`; a moved item or folder stays inside its own project, and a link target must belong to the same project.
- Moving a folder into itself or a descendant, or past the depth limit, is refused on the server, not just in the UI.
- Trashing a folder hides its whole subtree; restoring brings it back; deleting forever removes it.
- Note edits autosave and survive a reload; LINK URLs that are not `http(s)` are rejected.
- Unit tests cover the actions (ownership, validation, move and cycle rules, limits) and the tree helpers.
- The demo user gets the seeded research.

## Later (not in this version)
- A Research tab on the linked character, place and scene panels, next to Notes and Plots. Decided: later, once the library exists and its use is clear.
- Several links per item. Decided: one link per item; a note that touches several things can name them in its text.
- Labels on research items. Decided: no; folders already organize research, and labels stay a manuscript and plot tool.
