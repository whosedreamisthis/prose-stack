# Current Feature: Settings Formatting

The Formatting tab of the settings modal: font, size and line spacing for the manuscript, saved per project. Spec: `context/features/settings-formatting-spec.md` (related: `settings-spec.md`, `scene-editor-tools-spec.md`, `export-pdf-spec.md`).

## Status

In Progress

## Goals

- A **Formatting** tab in the settings modal (after General and Appearance) with Font, Font size, Line spacing and a live preview paragraph (the open scene's first lines when there is one, else a sample), updating as the controls change.
- **Font:** curated list of 12, each shown in its own typeface, default Georgia: Georgia, Times New Roman, Libre Baskerville, Lora, Merriweather, EB Garamond, Crimson Pro, Source Serif 4, Open Sans, Atkinson Hyperlegible, Courier Prime, Cousine. All self-hosted (Georgia and Times New Roman are system fonts; the PDF will use Gelasio and Tinos as metric-compatible stand-ins). The list is a constant in `lib/project-config.ts`, shared with the future PDF renderer.
- **Font size:** integer 10 to 18 (default 12), number input with stepper buttons (slider optional). **Line spacing:** single, 1.5 or double (default double).
- Applies to scene text in the editor, the book view and PDF export only, not the app interface; changing it never touches scene content, word counts or the "edited" date.
- Editor reads the project values as CSS variables on the editor container (`--editor-font`, `--editor-size`, `--editor-leading`): live preview behind the modal with no remount; Cancel restores the saved values.
- Reset to default (this tab only, confirmed) puts Georgia, 12, double in the draft; Save persists.
- Saved through `updateProjectSettings` (extend it with `fontFamily`, `fontSize`, `lineSpacing`, Zod validated on client and server: font in the list, integer 10 to 18, enum spacing); the tab shows a dot when it has unsaved changes; the settings store, `getChanges`, `getDirtyTabs` and `resetTab` cover the new fields.
- Project reads (`ProjectSummary`, `getProject`, `listProjects`) expose the formatting columns so the editor, the book view and the modal's saved values have them.
- The toolbar **Font size** menu stays as a shortcut to the same `Project.fontSize` (one source of truth): it saves at once through `updateProjectSettings` with only `fontSize`, and a size not in its list (such as 15) shows as the current value.
- Page size and margins are NOT part of this feature (export dialog only).
- Demo seed unaffected (columns already have defaults).

## Notes

- Columns `fontFamily`, `fontSize`, `lineSpacing` already exist on `Project`; no migration expected.
- Formatting is per project (unlike the theme, which is per user).
- Fonts load through `next/font` (self-hosted); only the editor and book view containers use them. Light and dark must both look right.
- The book view is still a placeholder and PDF export is not built, so they only need the shared constants and CSS variables ready for later.
- Per AGENTS.md, read the relevant guides in `node_modules/next/dist/docs/` before writing Next.js code (fonts: `01-getting-started/13-fonts.md`).
- The spec file was edited on `main` before loading (12 fonts, toolbar menu stays); it is uncommitted and goes in with this feature's branch.

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
- **Authentication:** Clerk sign-in/register in `app/(auth)`, route protection in `proxy.ts`, webhook user sync, first-request fallback in `lib/auth.ts`.
- **Projects:** `Project` model and migration, create/delete actions with a 5-project limit, `/projects` cover cards, navbar switcher, `/continue` landing on the last-opened project.
- **Sidebars & Layout:** project shell in `app/projects/[projectId]/layout.tsx` with collapsible left/right sidebars (parallel routes), mobile drawer, editor column, and project-only navbar stubs.
- **Project Accent Color (superseded by Settings & Theme: now one constant indigo):** `lib/accent.ts` derives `--primary`/`--ring` from the cover color, streamed per project as a `<style>` that turns off when the route is hidden; icon tooltips and breadcrumb removal included.
- **Manuscript Tree:** left-sidebar outline (book, parts, chapters, scenes) with add, rename and dnd-kit reorder; code in `components/manuscript/`, `lib/manuscript-tree.ts`, `actions/manuscript.ts`.
- **Scene Editor:** Tiptap editor per scene with debounced autosave, local backup copy and stats footer; code in `components/manuscript/SceneEditor.tsx`, `lib/autosave-scheduler.ts`, `hooks/useSceneAutosave.ts`.
- **Scene Editor Tools:** toolbar with undo/redo, font size menu, find and replace panel and thesaurus popover; code in `components/layout/EditorToolbar.tsx`, `components/manuscript/FindPanel.tsx`, `app/api/thesaurus/`.
- **Characters:** auto-saving sketches grouped Main/Supporting, row menu to archive or trash, multi-note Notes tab in the right sidebar; code in `components/characters/`, `actions/characters.ts`, `lib/characters.ts`, `ProjectSidebar.tsx`.
- **Read Caching:** tagged `use cache` reads for projects, outline, scenes, characters and notes, expired by `updateTag` in the actions, plus a 5-minute browser cache and hover prefetch; see `lib/cache-tags.ts`, `next.config.ts`.
- **Demo User:** Try demo button creates or resumes a temporary seeded Clerk user, one per IP via namespaced Upstash keys, expiry enforced per request and by a daily cleanup cron; see `lib/demo*.ts`, `app/api/demo/`.
- **Places:** auto-saving place cards with related-character checkboxes, header add button, row menu to archive or trash, and sidebar notes via the shared `NotesList`; see `components/places/`, `actions/places.ts`, `lib/places.ts`.
- **Trash & Archive:** Trash and Archive pages and sidebar sections with row menus, a read-only view of any trashed or archived item, restore, permanent delete and unarchive; see `components/trash/`, `actions/trash.ts`, `lib/trash.ts`.
- **Settings & Theme:** settings modal (General, Appearance), per-user light/dark theme with no-flash paint, constant indigo accent, logo favicon; see `components/settings/`, `lib/theme-config.ts`, `actions/settings.ts`.
