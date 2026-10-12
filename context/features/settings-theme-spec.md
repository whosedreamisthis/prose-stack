# Settings: Theme — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Projects & Settings, §10 UI / UX. Part of the settings modal: [settings-spec.md](settings-spec.md) (the **Appearance** tab).

## Summary

Switch the app between a light and a dark theme. Dark is what the app uses today; this adds light (which must look as good as dark across the whole app) and the control to change it. The control offers two choices only, Light and Dark; the system preference is used only as the starting point before a writer has chosen.

## Requirements
- An **Appearance** tab with a **Theme** choice: **Light** or **Dark**.
- The choice previews live while the modal is open and applies on Save; Cancel restores the saved theme.
- The theme applies to the whole app: navbar, sidebars, editor, dialogs and the Projects page, not only inside a project.
- No flash on load: the saved theme is known on the server, so the right theme class is on `<html>` in the first paint.
- **Light theme tokens.** Every color token (background, foreground, card, muted, border, input, popover, destructive) gets a light value, with 4.5:1 contrast for text and 3:1 for controls and focus rings.
- **Accent color in light.** The per-project accent (derived from the cover color) is lightened for the dark theme today. In light it is instead darkened until it meets 4.5:1 contrast on the light background, keeping the hue, and the foreground on it is chosen by contrast. The same function returns tokens for both themes, and the accent style sets both (`:root.dark{...}` and `:root:not(.dark){...}`).
- The scrollbar, selection and search highlight colors, which use the accent, work in both themes.
- **Book view follows the theme.** It is on screen, like the editor, so a dark theme gives a dark book view and a light theme a light one. Text color, page background and the page edge shadow use theme tokens.
- **PDF export is always light** (black text on white paper, as printed), whatever the app theme. The PDF renderer does not read the theme at all, so an export is identical for every user; the book view and the PDF therefore differ in color only, never in layout, fonts or pagination.
- **Default, before the writer has chosen:** follow the operating system's preference (`prefers-color-scheme`); if it cannot be determined, **light**. This applies to new users, existing users who have never chosen, and the signed-out pages (landing, sign-in). Once the writer picks Light or Dark, that choice is stored and wins from then on; the system preference is ignored.
- No flash on first paint in the unchosen state either: the page resolves the system preference before painting (a media query in the theme CSS, or a small blocking script; the build picks whichever hydrates without warnings).
- **Reset to default** on this tab clears the stored choice, returning to the system preference (or light).
- **Light theme quality is part of this feature, not a follow-up.** Every screen is checked in light before it ships: Projects, project shell and sidebars, manuscript tree, scene editor and toolbar, find panel, characters, places, notes dialog, Trash and Archive, dialogs and menus, toasts, the landing and auth pages. No dark-only hard-coded colors remain.

## Decision: per user, not per project
- A writer's preference for dark or light is about their screen and eyes, not the book, so it should follow them to every project. Per project would make them set it for each book.
- The overview and the first settings spec placed it on `Project.theme`. Decided: it is stored on the user and `Project.theme` is no longer used.
- Formatting (font, size, spacing) stays per project; it describes the manuscript.

## Data
- `User.theme` (`LIGHT` or `DARK`, **nullable**: null means the writer has not chosen, so the system preference applies). A migration adds it and drops `Project.theme` (nothing reads it yet).
- Written by `updateUserTheme`, which is separate from `updateProjectSettings` because it is not a project field; the modal's Save calls both when both changed.
- The theme is read where the root layout already reads the user, and cached under the user's tag (new `cacheTags.user`), expired by `updateUserTheme`.

## Acceptance criteria
- The book view matches the theme; an exported PDF is light in both themes.
- With no saved choice, the app follows the OS setting (light if unknown) from the first paint; after a choice, it ignores the OS setting.
- Choosing Light or Dark changes the whole app immediately in the preview and persists after Save.
- A reload and a new session show the saved theme with no flash of the other one.
- Text and controls meet contrast in both themes, including with every preset cover color as the accent.
- No screen listed above shows a dark-only color (dark panels, white-on-white text, invisible borders) in light theme.
- Cancel restores the theme that was saved.
- Demo users can change the theme (it is stored on their temporary user).
- Only the signed-in user's own theme is read or written.

## Open questions
- None open. (Default: system preference, else light. Stored per user. Book view follows the theme; PDF export is always light.)
