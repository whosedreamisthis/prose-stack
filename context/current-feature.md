# Current Feature: Project Accent Color

Inside a project, the app's accent color follows the cover color the user picked for it. Inline feature (no spec file); decisions come from the conversation.

## Status

In Progress

## Goals

- A pure, unit-tested function that turns a cover color (`#rrggbb`) into accent tokens for the dark theme: `primary`, `primary-foreground`, and `ring`; it keeps the cover's hue, lightens the color until it reads clearly against the dark background (contrast at least 4.5:1), and picks black or white text for use on top of it
- An invalid or missing color returns nothing, so the app falls back to the default tokens
- Breadcrumbs are removed from the editor column (decision): the sidebar tree and the project switcher already say where you are, and the editor will show the chapter and scene title itself once scenes exist; revisit if the collapsed-sidebar case feels lost
- Scope is the accent only: `--primary`, `--primary-foreground` and `--ring`; backgrounds, borders and surfaces are not tinted
- Scope is project pages only (`/projects/[projectId]/...`, including the navbar while you are on them); `/projects`, `/`, the auth pages and dialogs opened from `/projects` keep the default palette, and leaving a project removes the accent
- Hard load: a server component in the project layout, inside its own `<Suspense>`, looks up the project and streams a `<style>` tag that sets the tokens on `:root`, so the color is applied before hydration with no layout shift and no hydration mismatch
- `getProject` is wrapped in React `cache()` so the layout and the page share one query per request
- Fade, not flash: register `--primary`, `--primary-foreground` and `--ring` as typed custom properties (`@property`) and transition them (about 150 ms), so the swap from the neutral default to the project color is a soft fade; respect `prefers-reduced-motion`
- In-app navigation: switching projects from the navbar switcher applies the new accent immediately using the cover colors the switcher already has, without waiting for the server
- Unit tests for the color function: every preset cover color and extreme inputs (`#000000`, `#ffffff`, `#0f172a`, mid-tone, fully saturated) produce a primary that meets 4.5:1 against the dark background and a foreground that is readable on it; invalid input returns nothing
- Verify in the signed-in headless browser rig: computed `--primary` differs between two projects, the `<style>` tag is present in the server HTML, there are no console or Instant errors, and the accent is gone on `/projects`

## Notes

- No database change; uses `Project.coverColor` as stored
- Default dark primary is currently near-white (`oklch(0.922 0 0)`), so default buttons are white; inside a project, `bg-primary` buttons, active states and focus rings take the project color
- The cover color picker, presets and `getContrastColor` live in `lib/project-config.ts`; put the new function in a client-safe module (for example `lib/accent.ts`) because the switcher needs it in the browser too
- Cover colors can be any `#rrggbb` the user picks with the color input, so the lightening must handle very dark, very light and unsaturated colors
- The dev server's "Instant" check is on: keep the style component inside its own `<Suspense>` with a null fallback, as with the sidebar slots
- Per-project theme (light/dark) and editing the cover color belong to the Settings feature; when the color changes there, the accent follows because it is read from the project each request
- `components/ui` buttons already use `bg-primary` / `ring-ring`, so no component changes are expected beyond the tokens
- Read `node_modules/next/dist/docs/` before writing code; `cacheComponents` is on

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
- **Authentication:** Clerk sign-in/register in `app/(auth)`, route protection in `proxy.ts`, webhook user sync, first-request fallback in `lib/auth.ts`.
- **Projects:** `Project` model and migration, create/delete actions with a 5-project limit, `/projects` cover cards, navbar switcher, `/continue` landing on the last-opened project.
- **Sidebars & Layout:** project shell in `app/projects/[projectId]/layout.tsx` with collapsible left/right sidebars (parallel routes), mobile drawer, editor column, and project-only navbar stubs.
