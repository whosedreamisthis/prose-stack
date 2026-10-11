# ProseStack — Product Research & Requirements

A novel-writing app: manuscript, characters, places, plot, notes, and research in one workspace, with support for multiple projects.

---

## 1. Layout & Global UI

- **Left sidebar:** collapsible folder tree / section list for the current page. Collapses on small screens.
- **Right sidebar:** contextual panel (e.g. plot connections in the scene editor). Also collapsible.
- **Top navbar (right side):** spell check toggle, **Export to PDF**, and the Clerk user avatar.
- Fully responsive; both sidebars become drawers on small screens.
- Light and dark themes.

---

## 2. Core Pages

### 2.1 Manuscript

- Sidebar shows a collapsible folder tree: **Book → Part → Chapter → Scene**.
- Main area is the editor for the selected scene.
- Double-clicking any part, chapter, or scene opens an inline input to rename it.
- Each chapter ends with an **Add a scene** button.
- A new project's manuscript is seeded with **Chapter 1 → Scene 1**, containing _"Once upon a time..."_.

**Scene editor**

- Breadcrumbs above the editor: Book title › Part › Chapter › Scene (each a link back).
- Toolbar under the breadcrumbs:
  1. Undo / redo
  2. Find and replace
  3. Font size
  4. Thesaurus
  5. Read aloud (headphones icon), using a free library such as the browser Web Speech API
- Right sidebar: connect the scene to plot points (see 2.4).
- Footer stats: total words, page count, words written today.

**Book view (clicking the book title at the root)**

- Renders the manuscript as paginated book pages; long scenes flow onto additional pages.
- Title page: book title (large), subtitle beneath, then "by" on its own line, then the author name.

### 2.2 Characters

- Sidebar has a collapsible **Characters** section, split into **Main characters** and **Supporting characters**.
- Creating a character opens a sketch document pre-populated with these fields:

| Field                                     | Type                      |
| ----------------------------------------- | ------------------------- |
| Name                                      | Heading                   |
| Age, Location                             | Short text (shown inline) |
| Role in Story, Goal                       | Short text                |
| Physical Description, Personality         | Long text                 |
| Occupation, Habits/Mannerisms, Background | Long text                 |
| Internal Conflicts, External Conflicts    | Long text                 |
| Notes                                     | Long text                 |

### 2.3 Places

- A page of **place cards**; opening a card shows the full sketch.
- Fields: Name, Location, Role in Story, Related Characters (linked to character sketches), Season, Unique Features, Description, Sights, Sounds, Smell, Notes.

### 2.4 Plot

Three complementary views:

1. **Plot points** — index cards, one per plot item, reordered by drag and drop. Each card has an optional label and an ellipsis menu with **Send to trash**.
2. **Scenes** — one card per scene: truncated text in the upper section and a "Describe what happens in the scene..." text area. Cards can carry a label and have an ellipsis menu with **Send to trash**.
3. **Plot lines grid** — scenes listed down the left; plot lines run across the right. Adding a plot point on a scene's row links it to that scene. Linked plot points then show in the scene editor's right sidebar.

Users can create plot lines, then add and rearrange plot points within them.

**Labels** are managed in project settings; each has a name and a color.

### 2.5 Notes

General notes. Users can create standalone notes or organize them in folders.

### 2.6 Research

The original brief left this open. Proposed shape:

- Items of type **note**, **link** (URL, title, description), **image**, or **file** (e.g. PDF).
- Folders for organization.
- Optional link to a character, place, or scene.

### 2.7 Trash and Archive

- **Trash:** anything deleted lands here. Each item offers **Restore** or **Delete permanently**.
- **Archive:** documents can be archived (hidden from the main tree but kept). An archive view lists archived items, each with **Unarchive**.

---

## 3. Project Features

### 3.1 Multiple projects

Users can have several projects and load or switch between them.

### 3.2 Create-project flow

- Choose a **book cover** design from a list, then a **color**; the cover recolors live.
- Enter **author name**, **book title**, and **subtitle** (rendered on the cover), or upload a custom cover image instead.

### 3.3 Word count

- Words today and total shown in the scene footer; a project-wide total also appears in the sidebar or project header.
- Optional: daily word goal with a progress bar.

### 3.4 Project settings (modal)

| Setting       | Options                                   |
| ------------- | ----------------------------------------- |
| Project title | Text                                      |
| Font          | Dropdown of several fonts                 |
| Font size     | 10–18                                     |
| Line spacing  | Single, 1.5, Double                       |
| Theme         | Light / Dark                              |
| Labels        | Add / edit / remove labels (name + color) |

Buttons: **Save** and **Reset to default**.

### 3.5 Spell check and export

- **Spell check:** the browser's native spellcheck on the editor is the simplest option; a library such as `nspell` (Hunspell dictionaries) gives more control.
- **Export to PDF:** render the book view (paginated pages) and export it. Options are the browser print stylesheet (simplest) or a server-side/PDF library for exact page control.

---

## 4. Authentication & Demo

- Auth is handled by **Clerk**; the user avatar sits in the top navbar.
- Routes: `(auth)/sign-in` and `(auth)/register`.
- A **demo account** is seeded with sample parts, chapters, scenes, plot lines, characters, and places.

---

## 5. Saving Strategy (open question from the brief)

Recommended: **debounced autosave** from the editor.

- Save ~1–2 seconds after the user stops typing, plus on blur, on navigating away, and every ~30 seconds during continuous typing.
- Show a "Saving… / Saved" indicator.
- Keep a local copy (state or `localStorage`) so a failed save can retry without losing text.
- Save only changed scenes, not the whole manuscript.

---

## 6. Suggested Details (gaps filled)

- **Page count:** estimate ~250 words per page.
- **Words today:** net words added since local midnight, computed from a daily snapshot of the word total.
- **Editor:** Tiptap (ProseMirror) for rich text with built-in undo/redo; find/replace via an extension.
- **Thesaurus:** a free API such as Datamuse.
- **Drag and drop:** dnd-kit for plot cards and manuscript tree reordering.
- **Deleting a part or chapter** trashes its children too; restoring restores the whole subtree.
- **Accessibility:** keyboard navigation in the tree, labelled icon buttons, adequate contrast in both themes.
- **Nice-to-have:** project-wide search, export to DOCX/Markdown.

---

## 7. Open Questions

- What should Research look like beyond the proposal above?
- Should the book view start each chapter on a new page?
- Will collaboration ever be needed, or are projects always single-user?
- Is there a free tier with paid limits (projects, cover uploads)?
