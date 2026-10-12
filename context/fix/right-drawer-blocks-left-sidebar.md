# Fix: Right drawer blocks the left sidebar on medium screens

Related: [sidebars-layout-spec.md](../features/sidebars-layout-spec.md). Code: `components/layout/ProjectShell.tsx`.

## Problem

Between the `md` and `lg` breakpoints the left sidebar is a permanent inline column and the right sidebar is an overlay drawer. With the right drawer open, clicking an item in the left sidebar (scene, chapter, part, character, place, ...) closes the drawer but selects nothing.

## Cause

The right drawer's backdrop is `absolute inset-0 z-30` over the whole shell, and the inline left sidebar has no z-index, so the backdrop sits on top of it. The first click lands on the backdrop, which only closes the drawer.

## Fix

- On `md` and up the left sidebar sits above the backdrop (`md:relative md:z-40`), so it stays clickable and undimmed while the right drawer is open. The backdrop then dims only the main pane.
- Clicking a left item selects it and leaves the right drawer open; the right panel updates to the newly selected item.
- Below `md` nothing changes: the left sidebar is still a drawer, selecting an item closes it, and opening one drawer closes the other.
- The right drawer still closes with its toggle button, Escape, or a click on the backdrop over the main pane.

## Acceptance criteria
- At a medium width with the right drawer open, one click on a left-sidebar item selects it and the drawer stays open, showing that item's details.
- Clicking the dimmed main pane still closes the right drawer.
- Below `md` and at `lg` and up the layout behaves as before.
