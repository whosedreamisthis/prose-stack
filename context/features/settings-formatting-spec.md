# Settings: Formatting — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Projects & Settings, §6 Data Model. Part of the settings modal: [settings-spec.md](settings-spec.md) (the **Formatting** tab). Related: [scene-editor-spec.md](scene-editor-spec.md), [scene-editor-tools-spec.md](scene-editor-tools-spec.md), [export-pdf-spec.md](export-pdf-spec.md).

## Summary

How the manuscript text is set: font, size and line spacing. They are saved per project and apply to the editor, the book view and PDF export.

## Requirements
- A **Formatting** tab with three controls and a live preview paragraph:
  - **Font:** a curated list (default Georgia). Each option is shown in its own typeface. The list is web-safe or self-hosted fonts only, so the editor, book view and PDF can all render them; the list is a constant in `lib/project-config.ts` shared with the PDF renderer.
  - **Font size:** 10 to 18 (default 12). A number input with stepper buttons, and a slider is optional.
  - **Line spacing:** single, 1.5 or double (default double).
- The preview shows a sample paragraph (the first lines of the open scene when there is one) in the chosen settings and updates as the controls change. The editor also updates behind the modal.
- **Reset to default** (on this tab only) puts Georgia, 12 and double in the draft; Save persists them.
- Applies to scene text in the editor, the book view and the PDF export. It does not change the app's own interface font, sidebars or other pages.
- Changing formatting never marks a scene as edited and never touches its saved content: formatting is display only.
- Interaction with the toolbar's **Font size** menu in the scene editor tools: that menu is a quick way to change this same project setting. Both write `Project.fontSize`; there is one source of truth.

## Data
- Columns on `Project`, already present: `fontFamily` (default `Georgia`), `fontSize` (default 12), `lineSpacing` (`SINGLE`, `ONE_AND_HALF`, `DOUBLE`, default `DOUBLE`).
- Validation (Zod, shared by client and server): `fontFamily` must be one of the curated list; `fontSize` an integer from 10 to 18; `lineSpacing` one of the enum values. Anything else is rejected.
- Saved through `updateProjectSettings` (see [settings-spec.md](settings-spec.md)), which expires the cached project read.
- The editor reads the project's values and applies them as CSS variables on the editor container (`--editor-font`, `--editor-size`, `--editor-leading`), so a change needs no remount and no reload.

## Acceptance criteria
- A font size outside 10 to 18, an unknown font or an unknown spacing is rejected on the client and the server.
- Changing a control updates the preview and the editor immediately; Cancel puts the editor back as it was.
- After Save the editor, book view and PDF export all use the saved settings, and a reload keeps them.
- Reset to default restores Georgia, 12, double in the draft only, and needs Save.
- Formatting never changes scene content, word counts or the "edited" date.
- Writes are scoped by `userId` and `projectId`.

## Open questions
- Which fonts are in the curated list (a serif, a sans, a monospace for scripts)?
- Should page size and margins be settable here for PDF export later, or only in the export dialog?
- Does the toolbar font size menu stay once this exists, or move into this tab only?
