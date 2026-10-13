# Story Templates — Feature Spec

Source: [project-overview.md](../project-overview.md) §6 Data Model; related: [plot-spec.md](plot-spec.md), [research-spec.md](research-spec.md).

## Summary

Story structure templates (Hero's Journey, Eight-Sequence Method, Three-Act, Save the Cat, Romance beats, etc.) offered as a **reference resource**, not as a pre-built manuscript. Choosing a template never creates chapters or scenes. Writers can optionally track which beats they have covered.

## Design decision

Stamping template chapters/scenes into the manuscript tree was rejected: it is rigid, clutters the tree with empty nodes the writer must delete or rename, and implies a novel's chapters map 1:1 to beats (they rarely do — one beat can span several scenes, one scene can hit two beats). Instead the template lives beside the manuscript as a guide, and a beat can be loosely linked to scenes after the fact.

## Requirements
- New-project dialog: optional "Story structure" select (None by default). Choice is stored on the project; the manuscript starts empty either way.
- **Project settings, General tab:** a "Story structure" select (same options as the new-project dialog, plus None) to choose, change or remove the template at any time after the project is created. Saves with the rest of the General settings. Switching shows the progress-discard warning (see acceptance criteria).
- **Structure section in the left sidebar**, alongside the scene tree and search: lists the template's stages in order, each with a short description and writing prompts. Read-only reference text. With no template chosen it shows a short "Choose a story structure" prompt that opens the General settings tab.
- Each beat can be marked covered (checkbox) and optionally linked to one or more scenes. Linked scenes show a small beat badge in the tree/scene sidebar.
- Built-in templates (static data, no DB table): Three-Act, Hero's Journey (12 stages), Eight-Sequence, Save the Cat (15 beats), Romance (meet, barrier, black moment, resolution), plus genre notes for Fantasy and Sci-Fi (worldbuilding checklists, not plot beats).
- Out of scope for v1: custom user-authored templates, auto-assigning beats, word-count targets per beat.

## Data
- Templates defined in code: `lib/story-templates.ts` (`id`, `name`, `description`, `beats[{ key, title, description, prompts[] }]`).
- `Project.storyTemplateId String?` (null = none).
- `BeatProgress` (`projectId`, `beatKey`, `covered Boolean`, `notes String?`) unique on (`projectId`, `beatKey`); many-to-many to `ManuscriptNode` (scenes). Beat links are dropped when a scene is deleted; trashed scenes keep the link.

## Routes
- No new page; Structure section inside the left sidebar of the `/projects/[projectId]` editor layout, and a select in the General settings tab.
- Server actions: set/clear template, toggle beat covered, link/unlink scene. All validated with Zod.

## Demo seed
Seed the demo user's project with one template and a few beats marked covered/linked (per project convention that new user-data features also seed the demo user).

## Acceptance criteria
- Creating a project with a template leaves the manuscript tree empty.
- Switching templates keeps progress only for beat keys that still exist; the user is warned before progress is discarded.
- Beat–scene links persist and clean up on scene deletion.
- Scoped by `userId`/`projectId`; Structure section works on mobile and in dark theme.
