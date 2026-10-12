# Settings: Theme — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Projects & Settings, §10 UI / UX. Part of the settings modal: [settings-spec.md](settings-spec.md) (the **Appearance** tab).

## Summary

Switch the app between a light and a dark theme. Dark is what the app uses today; this adds light and the control to change it. There are two choices only, with no "follow the system" option.

## Requirements
- An **Appearance** tab with a **Theme** choice: **Light** or **Dark**.
- The choice previews live while the modal is open and applies on Save; Cancel restores the saved theme.
- The theme applies to the whole app: navbar, sidebars, editor, dialogs and the Projects page, not only inside a project.
- No flash on load: the saved theme is known on the server, so the right theme class is on `<html>` in the first paint.
- **Light theme tokens.** Every color token (background, foreground, card, muted, border, input, popover, destructive) gets a light value, with 4.5:1 contrast for text and 3:1 for controls and focus rings.
- **Accent color in light.** The per-project accent (derived from the cover color) is lightened for the dark theme today. In light it is instead darkened until it meets 4.5:1 contrast on the light background, keeping the hue, and the foreground on it is chosen by contrast. The same function returns tokens for both themes, and the accent style sets both (`:root.dark{...}` and `:root:not(.dark){...}`).
- The scrollbar, selection and search highlight colors, which use the accent, work in both themes.
- Default: **Dark** for a new user, matching how the app looks today. Signed-out pages (landing, sign-in) are dark.

## Decision: per user, not per project (recommended, to confirm)
- A writer's preference for dark or light is about their screen and eyes, not the book, so it should follow them to every project. Per project would make them set it for each book.
- The overview and the first settings spec placed it on `Project.theme`. The recommendation is to store it on the user and stop using `Project.theme`.
- Formatting (font, size, spacing) stays per project; it describes the manuscript.

## Data (if per user)
- `User.theme` (`LIGHT` or `DARK`, default `DARK`). A migration adds it and drops `Project.theme` (nothing reads it yet).
- Written by `updateUserTheme`, which is separate from `updateProjectSettings` because it is not a project field; the modal's Save calls both when both changed.
- The theme is read where the root layout already reads the user, and cached under the user's tag (new `cacheTags.user`), expired by `updateUserTheme`.

## Acceptance criteria
- Choosing Light or Dark changes the whole app immediately in the preview and persists after Save.
- A reload and a new session show the saved theme with no flash of the other one.
- Text and controls meet contrast in both themes, including with every preset cover color as the accent.
- Cancel restores the theme that was saved.
- Demo users can change the theme (it is stored on their temporary user).
- Only the signed-in user's own theme is read or written.

## Open questions
- Per user (recommended) or per project?
- Is Dark the right default for new users (as the app is today), or should they start in light?
- Should the book view and PDF export always be light (paper), whatever the app theme?
