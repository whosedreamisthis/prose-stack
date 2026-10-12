# Proofreading — Feature Spec

Source: [spell-check-spec.md](spell-check-spec.md) (spelling); related: [scene-editor-spec.md](scene-editor-spec.md), [scene-editor-tools-spec.md](scene-editor-tools-spec.md), [project-overview.md](../project-overview.md) §4 Tech Stack, §9 Monetization.

## Summary

A manual proofreading pass for grammar, punctuation and style in the scene editor. Spelling stays with spell check, which is a live toggle; proofreading is a deliberate "review this scene" action that lists suggestions the writer accepts or dismisses one by one.

## Design decisions
- **Manual, not live.** Constant grammar underlines are noisy in fiction, where fragments, dialect and run-ons are often intentional. The writer asks for a pass and works through the results.
- **Suggestions, never silent edits.** Nothing changes until the writer accepts it, and each acceptance is one undo step in the editor.
- **Fiction-aware.** Dialogue, deliberate fragments, character and place names, and invented words are not flagged as errors. Character and place names from the project are passed as a custom dictionary.

## Requirements
- A **Proofread** tool in the editor toolbar and the scene's "…" menu, with a keyboard shortcut. It reviews the open scene, or the current selection if there is one.
- Results open in a panel (right sidebar tab) listing suggestions in reading order. Each shows the flagged text in context, a short reason, and a suggested replacement where there is one.
- Per suggestion: **Accept** (applies the replacement), **Dismiss** (hides it for this pass) and **Ignore always** (adds the rule or word to the project's ignore list). Clicking a suggestion highlights and scrolls to its text in the editor.
- Categories, each switchable in the panel: grammar, punctuation, style (repeated words, filler words, passive voice, overlong sentences), and consistency (a name spelled two ways, inconsistent quote style).
- A scene that changes while the panel is open marks stale suggestions as out of date and offers **Run again**; it never applies a suggestion to text that has moved.
- Empty result shows "No suggestions", not a blank panel. Long scenes are processed in chunks with a progress indicator and can be cancelled.
- Settings: language (default English), the categories to include, and the project ignore list (view and remove entries).

## Approach (undecided)
- **Option A: a rule-based checker (LanguageTool).** Deterministic, cheap, explains each rule, supports a custom dictionary. Can use the hosted API (manuscript text leaves the app) or be self-hosted (more to run). Weak at style and consistency across a whole scene.
- **Option B: an AI model pass.** Better at style, tone and consistency and at leaving intentional fiction alone; slower, costs per use, and sends manuscript text to a model provider.
- **Option C (recommended): rule-based for grammar and punctuation, AI only for the optional style and consistency categories**, behind one suggestion format so the panel does not care where a suggestion came from. Start with Option A alone and add the AI categories as a second step.
- Either way the work runs in a server Route Handler, never in the browser, with the API key kept on the server.

## Privacy and limits
- Manuscript text leaves the app only when the writer presses Proofread, and the panel says which service receives it before the first run (a one-time notice they must accept).
- Nothing from a proofread is stored except the project ignore list.
- Rate limit per user (and a stricter one for demo users); a maximum scene length per request, larger scenes chunked.
- Possible paid feature later (see Monetization).

## Data
- `ProofreadIgnore` (`projectId`, `kind` word or rule, `value`) unique on (`projectId`, `kind`, `value`). No suggestions are persisted.
- Demo seed: none; the demo user can run Proofread but cannot save to a custom ignore list beyond its 12-hour project.

## Routes
- `POST /api/proofread` taking `{ projectId, sceneId or text range, categories }` and returning suggestions with offsets, reasons and replacements. Only the signed-in owner can use it; input is validated with Zod.

## Acceptance criteria
- Accepting a suggestion changes only the flagged text and can be undone with one undo.
- Dialogue fragments and project character and place names are not flagged as spelling or grammar errors.
- Dismissing and ignoring persist for the pass and the project respectively; "Ignore always" survives a reload.
- A 5,000-word scene completes without timing out, in chunks, with a visible progress state.
- Offline or a service failure shows an error and leaves the scene untouched.

## Open questions
- Rule-based first (Option A) with AI categories later, or both at launch?
- Hosted API or self-hosted checker?
- English only at first, or other languages from the start?
- Should Proofread cover a whole chapter or the whole book, or only a scene?
- Is this a paid feature (see Monetization)?
