# Settings: Formatting — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Projects & Settings, §6 Data Model. Part of the settings modal: [settings-spec.md](settings-spec.md) (the **Formatting** tab). Related: [scene-editor-spec.md](scene-editor-spec.md), [scene-editor-tools-spec.md](scene-editor-tools-spec.md), [export-pdf-spec.md](export-pdf-spec.md).

## Summary

How the manuscript text is set: font, size and line spacing. They are saved per project and apply to the editor, the book view and PDF export.

## Requirements
- A **Formatting** tab with three controls and a live preview paragraph:
  - **Font:** a curated list of 12 (default Georgia, see below). Each option is shown in its own typeface. Every font is self-hosted, so the editor, book view and PDF can all render it; the list is a constant in `lib/project-config.ts` shared with the PDF renderer.
  - **Font size:** 10 to 18 (default 12). A number input with stepper buttons, and a slider is optional.
  - **Line spacing:** single, 1.5 or double (default double).
- The preview shows a sample paragraph (the first lines of the open scene when there is one) in the chosen settings and updates as the controls change. The editor also updates behind the modal.
- **Reset to default** (on this tab only) puts Georgia, 12 and double in the draft; Save persists them.
- Applies to scene text in the editor, the book view and the PDF export. It does not change the app's own interface font, sidebars or other pages.
- Changing formatting never marks a scene as edited and never touches its saved content: formatting is display only.
- **Page size and margins are not set here.** They belong to the PDF export dialog only, so this tab stays about how the text looks on screen and the book's typeface.
- **The toolbar's Font size menu stays.** It is a shortcut to this same project setting, kept because changing size while writing is common and opening a modal for it is slow. Both write `Project.fontSize`; there is one source of truth.
  - The toolbar saves at once (it has no Save button); the tab saves with the modal's Save. They cannot conflict because the modal is open on its own, so the toolbar is out of reach while the tab is open.
  - The menu offers the usual sizes (10, 11, 12, 13, 14, 16, 18); a size set here that is not in that list (such as 15) shows as the current value, marked selected, and stays until another size is picked.
  - Font and line spacing have no toolbar control; this tab is the only place for them.

## The font list (12)
Georgia is the default. The names marked * are system fonts, so the editor and book view use the writer's own copy while the PDF embeds a metric-compatible, self-hosted stand-in (Georgia → Gelasio, Times New Roman → Tinos), so line breaks and page counts match.

| Group | Fonts |
| --- | --- |
| Serif | Georgia*, Times New Roman*, Libre Baskerville, Lora, Merriweather, EB Garamond, Crimson Pro, Source Serif 4 |
| Sans-serif | Open Sans, Atkinson Hyperlegible |
| Monospace (for scripts) | Courier Prime, Cousine |

Courier Prime is the screenplay-style choice; Atkinson Hyperlegible is there for accessibility. The list is a starting point and is easy to change in `lib/project-config.ts`, as long as each font also ships with the PDF renderer.

## Data
- Columns on `Project`, already present: `fontFamily` (default `Georgia`), `fontSize` (default 12), `lineSpacing` (`SINGLE`, `ONE_AND_HALF`, `DOUBLE`, default `DOUBLE`).
- Validation (Zod, shared by client and server): `fontFamily` must be one of the curated list; `fontSize` an integer from 10 to 18; `lineSpacing` one of the enum values. Anything else is rejected.
- Saved through `updateProjectSettings` (see [settings-spec.md](settings-spec.md)), which expires the cached project read. The toolbar's size menu calls the same action with only `fontSize`.
- The editor reads the project's values and applies them as CSS variables on the editor container (`--editor-font`, `--editor-size`, `--editor-leading`), so a change needs no remount and no reload.

## Acceptance criteria
- A font size outside 10 to 18, an unknown font or an unknown spacing is rejected on the client and the server.
- The list offers exactly the 12 fonts above, each shown in its own typeface, and every one renders in the editor, the book view and the PDF.
- Changing a control updates the preview and the editor immediately; Cancel puts the editor back as it was.
- After Save the editor, book view and PDF export all use the saved settings, and a reload keeps them.
- Picking a size in the toolbar menu and in this tab both change the same setting; the tab shows the toolbar's choice the next time it opens, and a size such as 15 set in the tab shows in the toolbar menu as the current value.
- Reset to default restores Georgia, 12, double in the draft only, and needs Save.
- Formatting never changes scene content, word counts or the "edited" date.
- Writes are scoped by `userId` and `projectId`.

## Open questions
- None open. (12 fonts including Courier Prime; page size and margins only in the export dialog; the toolbar size menu stays as a shortcut to the same setting.)
