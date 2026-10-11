---
name: feature
description: Manage current feature workflow - start, review, explain or complete
argument-hint: load|start|test|review|explain|complete
---

# Feature Workflow

Manages the full lifecycle of a feature from spec to merge.

## Working File

@context/current-feature.md

### File Structure

current-feature.md has these sections:

- `# Current Feature` - H1 heading with feature name when active
- `## Status` - Not Started | In Progress | Complete
- `## Goals` - Bullet points of what success looks like
- `## Notes` - Additional context, constraints, or details from spec
- `## Completed Features` - One short line per completed feature (append only, earliest to latest), so every session knows what exists

### History File

Full summaries of completed features are recorded in `context/feature-history.md` (append only, earliest to latest). It isn't imported here or in `CLAUDE.md`, so it stays out of every session's context; read it only when the one-line entry isn't enough.

## Task

Execute the requested action: $ARGUMENTS

| Action     | Description                               |
| ---------- | ----------------------------------------- |
| `load`     | Load a feature spec or inline description |
| `start`    | Begin implementation, create branch       |
| `test`     | Write and run unit tests for the feature  |
| `review`   | Check goals met, code quality             |
| `explain`  | Document what changed and why             |
| `complete` | Commit, push, merge, reset                |

See [actions/](actions/) for detailed instructions.

If no action provided, explain the available options.
