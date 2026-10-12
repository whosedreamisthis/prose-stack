# Sidebars & Layout — Feature Spec

Source: [project-overview.md](../project-overview.md) §10 UI / UX, §5 Architecture.

## Summary

The app shell: left sidebar, right sidebar, and top navbar.

## Requirements
- **Left sidebar:** collapsible tree/list for the current page (manuscript tree, character list, place list, etc.). Becomes a drawer on small screens.
- **Right sidebar:** contextual panel, collapsible. In the scene editor it shows scene details (see [scene-sidebar-spec.md](scene-sidebar-spec.md)). Hidden or empty on pages with no context.
- **Top navbar:** project switcher, spell check toggle, **Export to PDF**, settings, Clerk avatar (right side).
- **Editor toolbar:** undo/redo, find & replace, font size, thesaurus, read aloud. Page-specific, and centered above the main pane (not the window) so it lines up with the writing area whichever sidebars are open.
- **Editor column:** writing area and stats footer.
- Calm, distraction-free styling: follows the system theme, light if unknown (see [settings-theme-spec.md](settings-theme-spec.md)), clean typography, subtle borders and shadows.

## State
- Sidebar open/closed, active project, modals: **Zustand** store (not React Context).
- Server components load tree/page data; client components handle interaction.

## Acceptance criteria
- Both sidebars collapse and expand without layout shift in the editor.
- Left sidebar is a drawer below the small-screen breakpoint.
- Sidebar open/closed state persists across navigation within a session.

## Open questions
- None. Decided: sidebar open/closed state lasts for the session only (Zustand, no localStorage); it is not persisted across sessions or per project.
