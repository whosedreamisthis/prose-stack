# Current Feature: Settings & Theme

Settings modal (not a route) with General and Appearance tabs, plus a per-user Light/Dark theme. Specs: `context/features/settings-spec.md`, `context/features/settings-theme-spec.md`.

## Status

In Progress

## Goals

- Settings modal opened from the navbar Settings button (project pages only), replacing the disabled placeholder; tabs in order General, Appearance (Formatting and Labels are later features); vertical tabs from `md` up, horizontal row below; fixed dialog height with the panel scrolling.
- Accessibility: `role="tablist"` with roving focus (arrows, Home, End), `role="tabpanel"` labelled by its tab, focus trap, Escape closes, focus returns to the Settings button.
- Footer: Save (disabled until changed, one request, closes modal), Cancel/close/Escape/outside click (ask "Discard your changes?" if edits), Reset to default (open tab only, after confirming, sets the draft; not on General). Tab strip shows a dot on tabs with unsaved changes.
- General tab: Title (required, max 120), Subtitle (optional, max 160), Author (required, max 80), same rules as project creation. Cover design/color not editable here.
- State in a Zustand store (`lib/stores/settings-store.ts`): open state, active tab, draft (copy of saved values on open); edits in other tabs survive tab switches.
- `updateProjectSettings` server action: only changed fields, Zod validated, one write scoped by `userId` and `projectId`, expires the `project` cache tag.
- Appearance tab: Theme choice Light or Dark; previews live while open, applies on Save, Cancel restores the saved theme; Reset to default clears the stored choice.
- `User.theme` (`LIGHT`/`DARK`, nullable: unset follows `prefers-color-scheme`, else light); migration adds it and drops `Project.theme`; written by `updateUserTheme` (separate action, Save calls both when both changed); read where the root layout reads the user, cached under new `cacheTags.user`, expired by `updateUserTheme`.
- No flash on first paint, including the unchosen state (media query or blocking script, whichever hydrates without warnings); applies to signed-out pages too.
- Complete light theme: light values for every color token (background, foreground, card, muted, border, input, popover, destructive) with 4.5:1 text and 3:1 controls/focus rings; no dark-only hard-coded colors on any screen (Projects, shell and sidebars, manuscript tree, scene editor and toolbar, find panel, characters, places, notes dialog, Trash and Archive, dialogs, menus, toasts, landing and auth).
- Constant accent: one indigo matching the ProseStack logo (indigo-600 in light, indigo-400 in dark) in every project, set as `--primary`/`--ring` tokens in `globals.css`; the per-project cover-color accent (`lib/accent.ts`, streamed `<style>`, switcher injection) is removed. Scrollbar, selection and search highlight use it in both themes. Selected sidebar rows use the accent fill in light.
- Favicon is the ProseStack logo mark (`app/icon.svg`).
- Book view follows the theme (text, page background, edge shadow use theme tokens); PDF export is always light and never reads the theme.
- Demo users can change the theme; only the signed-in user's own theme is read or written.
- Demo seed unaffected (no new user data beyond the theme preference).

## Notes

- Decision: theme is per user, not per project; `Project.theme` is no longer used. Formatting stays per project (later feature).
- Open questions in the specs (deep-linkable tabs, cover in modal) are deferred; not part of this feature.
- Per AGENTS.md, read the relevant guides in `node_modules/next/dist/docs/` before writing Next.js code.

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
