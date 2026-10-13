# Summary Tab (Scenes, Chapters, Parts) — Feature Spec

Source: new feature. Related: [plot-spec.md](plot-spec.md), [scene-search-spec.md](scene-search-spec.md).

## Summary

A **Summary** tab in the right sidebar with a text area for writing a short summary. It appears for the open **scene**, **chapter** and **part**.

## Requirements
- New **Summary** tab beside the existing tabs:
  - Scene: next to Notes and Plots (`SceneDetailsPanel`, via `DetailTabs`).
  - Chapter and part: in the chapter and part details sidebar (`NodeDetailsPanel`, loaded by `NodeDetailsLoader`), as a tab for the chapter's or part's own summary.
- The tab holds one labelled text area.
- The summary autosaves, with no save button (same pattern as the character sketch fields: save when the field loses focus, "Saving…" status line).
- Switching to another scene, chapter or part swaps the text without a full reload (the panels are remounted per node).
- A character counter near the limit; the limit is 2000 characters (`manuscript-config.ts`).
- Empty text clears the summary (stored as `null`).
- The whole-book view is out of scope.

## Data
- None new. `ManuscriptNode.summary` already exists and the Zod schema already allows 2000 characters. It is currently documented as scenes only, so the comment in `schema.prisma` should be updated.
- `saveSceneSummary` in `actions/manuscript.ts` already saves it, but only for `type: "SCENE"`. Extend it (and rename it, e.g. `saveNodeSummary`) to also accept chapters and parts. Nothing in the UI calls it yet.
- The scene read already returns `summary`. Chapter and part reads need to return it too.
- Saving must expire the node's cached read and the scene-search index, which is built from `summary`.

## Acceptance criteria
- The Summary tab shows for a scene, a chapter and a part, each with its own text area.
- Typing and leaving the field saves the summary; reopening the node shows it.
- Scene Search still finds scenes by words in their summary.
- Input validated with Zod on the server; queries scoped by `userId` and `projectId`; trashed nodes are rejected.
- The demo seed gives example summaries to a few scenes, a chapter and a part.
- Unit tests cover the extended action (scene, chapter, part, wrong project, trashed).

## Open questions
- None. (Showing the summary on the left outline rows, for example as a tooltip, was left out.)
