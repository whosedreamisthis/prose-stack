# Current Feature: Characters

A sketch document per character, split into Main and Supporting. Spec: `context/features/characters-spec.md`.

## Status

In Progress

## Goals

- Sketch fields: name, age, location, role, goal, appearance, personality, occupation, habits, background, internal conflicts, external conflicts. (No sketch `notes` field; notes live in the right sidebar tab.)
- Characters grouped into **Main** and **Supporting** (`CharacterRole`).
- Create, edit, trash, and archive characters.
- Select a character from the left sidebar list.
- Right sidebar offers a **Notes** tab (built so more tabs can be added later).
- Notes tab shows an "Add a note +" card with a dashed border; clicking it adds a note.
- Several notes per character, each shown as a card; notes belong to the selected character.
- Route: `/projects/[projectId]/characters`.
- All queries scoped by `userId` and `projectId`.
- Input validated with Zod on the server.
- Trashed/archived characters disappear from the list and appear in Trash/Archive.

## Notes

- Source: `context/project-overview.md` §3 Characters, §6 Data Model.
- Data: `Character` model (`role`, `name`, `age`, `location`, `roleInStory`, `goal`, `physicalDescription`, `personality`, `occupation`, `habits`, `background`, `internalConflicts`, `externalConflicts`, `trashedAt`, `archivedAt`).
- Related to `Place` via `PlaceCharacters`.
- Multiple notes per character need their own model (e.g. `CharacterNote` with `characterId`, `content`; cascades from `Character`). Scoped by `userId`/`projectId` through its character, and validated with Zod.
- Right sidebar is a parallel route; tabs should be a small extensible list so later tabs can be added.

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
- **Authentication:** Clerk sign-in/register in `app/(auth)`, route protection in `proxy.ts`, webhook user sync, first-request fallback in `lib/auth.ts`.
- **Projects:** `Project` model and migration, create/delete actions with a 5-project limit, `/projects` cover cards, navbar switcher, `/continue` landing on the last-opened project.
- **Sidebars & Layout:** project shell in `app/projects/[projectId]/layout.tsx` with collapsible left/right sidebars (parallel routes), mobile drawer, editor column, and project-only navbar stubs.
- **Project Accent Color:** `lib/accent.ts` derives `--primary`/`--ring` from the cover color, streamed per project as a `<style>` that turns off when the route is hidden; icon tooltips and breadcrumb removal included.
- **Manuscript Tree:** left-sidebar outline (book, parts, chapters, scenes) with add, rename and dnd-kit reorder; code in `components/manuscript/`, `lib/manuscript-tree.ts`, `actions/manuscript.ts`.
- **Scene Editor:** Tiptap editor per scene with debounced autosave, local backup copy and stats footer; code in `components/manuscript/SceneEditor.tsx`, `lib/autosave-scheduler.ts`, `hooks/useSceneAutosave.ts`.
- **Scene Editor Tools:** toolbar with undo/redo, font size menu, find and replace panel and thesaurus popover; code in `components/layout/EditorToolbar.tsx`, `components/manuscript/FindPanel.tsx`, `app/api/thesaurus/`.
