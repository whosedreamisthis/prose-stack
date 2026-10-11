# Current Feature: Manuscript

The core writing experience: a collapsible manuscript tree, a rich scene editor, and a paginated book view. Spec: `context/features/manuscript-spec.md`.

## Status

In Progress

## Goals

- Collapsible tree: Book → Part → Chapter → Scene (chapters may sit directly under the book).
- Double-click any tree item to rename.
- "Add a scene" button at the end of each chapter.
- Reorder via drag and drop (dnd-kit); siblings ordered by integer `position`, updated in one transaction.
- Seed new projects with Chapter 1 / Scene 1 ("Once upon a time...").
- Tiptap scene editor with undo/redo, find & replace, font size, thesaurus, read-aloud, spell check. No breadcrumbs (the sidebar tree shows location); show the scene title above the writing area.
- Layout order: toolbar, scene title, writing area, stats footer.
- Right sidebar shows and edits plot points linked to the scene (see plot-spec.md).
- Debounced autosave (1.5 s idle, forced flush every 10 s while typing, on blur/navigation); only the changed scene is saved; Saving/Saved indicator; local copy allows retry on failure.
- Footer stats: total words, pages, words today (from `DailyWordCount` snapshots).
- Book view: root of the tree renders the manuscript as paginated book pages; first page is a title page (title, subtitle, "by", author); each chapter starts on a new page.
- Routes: `/projects/[projectId]/manuscript`, `/projects/[projectId]/manuscript/book`, `/api/thesaurus` (Datamuse proxy).
- Acceptance: hierarchy rules validated server-side (Part → Chapter → Scene); rename, reorder and add-scene persist across reload; typing triggers non-blocking autosave with retry on failure; word counts update per scene and roll up to project totals.

## Notes

- Data: `ManuscriptNode` (self-referencing; `type` = PART | CHAPTER | SCENE). Scene fields: `content` (Tiptap JSON), `summary`, `wordCount`, `labelId`. `DailyWordCount` for words-today.
- Decisions: breadcrumbs dropped; autosave 1.5 s debounce + 10 s max wait; spell check uses the browser's native `spellcheck` attribute, toggled by the navbar Spell check button (`nspell` can be added later); chapters start on a new page in book view.
- Source: project-overview.md §3 Manuscript, §5 Architecture, §6 Data Model.

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
- **Authentication:** Clerk sign-in/register in `app/(auth)`, route protection in `proxy.ts`, webhook user sync, first-request fallback in `lib/auth.ts`.
- **Projects:** `Project` model and migration, create/delete actions with a 5-project limit, `/projects` cover cards, navbar switcher, `/continue` landing on the last-opened project.
- **Sidebars & Layout:** project shell in `app/projects/[projectId]/layout.tsx` with collapsible left/right sidebars (parallel routes), mobile drawer, editor column, and project-only navbar stubs.
- **Project Accent Color:** `lib/accent.ts` derives `--primary`/`--ring` from the cover color, streamed per project as a `<style>` that turns off when the route is hidden; icon tooltips and breadcrumb removal included.
