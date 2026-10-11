# Current Feature: Sidebars & Layout

The app shell for a project: collapsible left sidebar, collapsible right sidebar, top navbar, and the editor column. Spec: `context/features/sidebars-layout-spec.md`.

## Status

In Progress

## Goals

- A shared project layout at `app/projects/[projectId]/layout.tsx` that wraps every project page in the shell; `/projects`, the auth pages and `/` stay outside it
- **Left sidebar:** collapsible, shows a slot for the current page's tree or list (empty placeholder content until the Manuscript, Characters and Places features fill it); below the small-screen breakpoint it becomes a drawer
- **Right sidebar:** collapsible contextual panel; renders nothing (and takes no space) on pages with no context; ships with an empty panel for the scene details that the scene-sidebar spec adds
- **Top navbar:** keeps the project switcher and Clerk avatar; adds Spell check toggle, Export to PDF and Settings as disabled stubs with a "coming soon" label, to be wired by their own features
- **Editor column:** breadcrumbs (project, then page), a toolbar row with disabled stubs (undo/redo, find and replace, font size, thesaurus, read aloud), the writing area slot, and a stats footer slot
- Sidebar open/closed state lives in the Zustand store and survives navigation within a session; it is not persisted across sessions or per project (decision recorded in the spec)
- Collapsing and expanding either sidebar causes no layout shift in the editor column
- Replaces the placeholder manuscript page content with the shell, keeping `ActiveProjectSync` and the project title
- Accessible controls: buttons for toggling have labels and `aria-expanded`, the drawer traps focus and closes on Escape
- Unit tests for any extracted logic (for example the store's toggle behaviour); no component tests, per the project's testing rules

## Notes

- No database change and no migration
- Decision: dark stays the default theme (the root `<html>` keeps the `dark` class, per the coding standard); light mode and the per-project theme setting come with the Settings feature
- Reuse the existing shadcn/ui components (`Button`, `DropdownMenu`, `Dialog`) and add `Sheet` for the mobile drawer; Base UI-style triggers use the `render` prop
- `cacheComponents` is on: anything reading `params` or the session must sit behind `<Suspense>`; keep the layout's static shell outside the Suspense boundary so there is no layout shift
- Decision: one navbar only. The root `components/navbar.tsx` stays and gains Spell check, Export to PDF and Settings stubs that appear only on project routes (a client component reading `useParams`); no second header
- Requested, not yet scoped: the app's color palette should follow the cover color the user picked for the project. Build the shell with semantic tokens (`bg-primary`, `border-border`, `text-muted-foreground`) rather than fixed colors so a per-project palette can be applied later; open questions are scope (accent only or tinted surfaces), contrast on the dark default, and whether it applies outside project pages
- Left and right sidebar content comes from Next.js parallel routes (`@left`, `@right`) so each page supplies its own panel with server rendering and no flicker; each slot must sit in its own `<Suspense>` in the layout, because Next.js resolves slots at request time under Cache Components and otherwise flags an "Instant" uncached-data error (found by elimination with a signed-in headless browser); `default.tsx` renders nothing, and the right panel marks itself present so the toggle enables
- Collapsing the left sidebar must not unmount the editor or lose its content
- Read `node_modules/next/dist/docs/` for layouts and nested layouts before writing code

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
- **Authentication:** Clerk sign-in/register in `app/(auth)`, route protection in `proxy.ts`, webhook user sync, first-request fallback in `lib/auth.ts`.
- **Projects:** `Project` model and migration, create/delete actions with a 5-project limit, `/projects` cover cards, navbar switcher, `/continue` landing on the last-opened project.
