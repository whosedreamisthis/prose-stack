# Proofreading — Feature Spec

Source: [spell-check-spec.md](spell-check-spec.md) (spelling); related: [scene-editor-spec.md](scene-editor-spec.md), [scene-editor-tools-spec.md](scene-editor-tools-spec.md), [project-overview.md](../project-overview.md) §4 Tech Stack.

## Summary

A manual proofreading pass for punctuation, style and consistency in the scene editor, built entirely on free open-source libraries (no AI, no paid service). Spelling stays with spell check, which is a live toggle; proofreading is a deliberate "review this scene" action that lists suggestions the writer accepts or dismisses one by one.

## Design decisions
- **No AI and no paid services.** The project has no budget and no payment card, so there is no AI model, no API key and no per-use cost.
- **Manual, not live.** Constant underlines are noisy in fiction, where fragments, dialect and run-ons are often intentional. The writer asks for a pass and works through the results.
- **Suggestions, never silent edits.** Nothing changes until the writer accepts it, and each acceptance is one undo step in the editor.
- **Fiction-aware.** Dialogue, deliberate fragments, character and place names, and invented words are not flagged as errors. Character and place names from the project are passed as a custom dictionary.
- **Honest about its limits.** Pattern-based tools cannot judge meaning, so the panel presents itself as a style and consistency check, not a full grammar checker.

## Requirements
- A **Proofread** tool in the editor toolbar and the scene's "…" menu, with a keyboard shortcut. It reviews the open scene, or the current selection if there is one.
- Results open in a panel above the scene (like Find and replace), not in the right sidebar, listing suggestions in reading order, with a close button and Escape to end the review. Each shows the flagged text in context, a short reason, and a suggested replacement where there is one.
- Per suggestion: **Accept** (applies the replacement), **Dismiss** (hides it for this pass) and **Ignore always** (adds the rule or word to the project's ignore list). Clicking a suggestion highlights and scrolls to its text in the editor.
- Categories, each switchable in the panel:
  - **Punctuation and usage:** repeated words, "a/an" mistakes, contraction and punctuation slips.
  - **Style:** filler and weasel words, passive voice, overlong sentences.
  - **Consistency:** a name spelled two ways (checked against the project's characters and places), mixed straight and curly quotes.
- A scene that changes while the panel is open marks stale suggestions as out of date and offers **Run again**; it never applies a suggestion to text that has moved.
- Empty result shows "No suggestions", not a blank panel. Long scenes are processed in chunks with a progress indicator and can be cancelled.
- **Scope: one scene or the current selection, nothing larger.** The whole book is never covered. Chapters are a possible later step: they need suggestions from several scenes in one panel and Accept that edits whichever scene editor is mounted, which this first version avoids.
- Settings: a **Proofreading** tab with the categories to show and the project ignore list (view and remove entries). English only at first. On a phone the settings tab strip shows one tab at a time, with left and right chevrons to step through the tabs.

## Approach: free libraries only
- **Rules from the unified/retext family**, run on the scene's plain text in a server Route Handler (or in the browser): repeated words, passive voice, filler and weasel words, overlong sentences, "a/an" mistakes, contraction and punctuation checks. Pick the exact packages when the feature starts and check their current docs.
- **Spelling stays with nspell** (already used by Spell Check), with project character and place names as the custom dictionary.
- **Consistency checks are our own code:** name variants compared against the project's characters and places, and mixed quote styles.
- **Limit:** these tools catch patterns, not meaning. They will miss grammar errors that need context (tense drift, agreement across a clause) and a wrong-but-correctly-spelled word.
- Every checker returns the same suggestion format (range, reason, replacement), so the panel does not care which checker produced it and a better one can be added later without changing the panel.
- **Not used:** AI models, the hosted LanguageTool API (rate limited, and text would leave the app) and a self-hosted LanguageTool (needs a Java server to host). Either of the last two could be an optional later addition if the situation changes.

## Privacy and limits
- Manuscript text stays on the app's own server; no third-party service receives it, so no consent notice is needed.
- Nothing from a proofread is stored except the project ignore list.
- A maximum scene length per request, larger scenes chunked; a light per-user rate limit (stricter for demo users) to protect the server.

## Data
- `ProofreadIgnore` (`projectId`, `kind` word or rule, `value`) unique on (`projectId`, `kind`, `value`). No suggestions are persisted.
- Demo seed: none; the demo user can run Proofread but cannot save to a custom ignore list beyond its 12-hour project.

## Routes
- `POST /api/proofread` taking `{ projectId, sceneId or text range, categories }` and returning suggestions with offsets, reasons and replacements. Only the signed-in owner can use it; input is validated with Zod.

## Acceptance criteria
- Accepting a suggestion changes only the flagged text and can be undone with one undo.
- Dialogue fragments and project character and place names are not flagged as spelling or style errors.
- Dismissing and ignoring persist for the pass and the project respectively; "Ignore always" survives a reload.
- A 5,000-word scene completes without timing out, in chunks, with a visible progress state.
- A failure shows an error and leaves the scene untouched.
- No feature of Proofread needs an API key, a paid account or a payment card.

## Open questions
- Which retext packages give the best results on fiction with the fewest false positives? (Try them on the demo project before deciding.)
