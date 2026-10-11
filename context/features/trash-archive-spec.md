# Trash & Archive — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Trash & Archive, §5 Architecture (soft delete).

## Summary

Soft delete and archiving so nothing is lost by accident.

## Requirements
- Deleting sets `trashedAt`; the item moves to **Trash**.
- Trash page: **restore** or **delete permanently** (only then are rows removed).
- Trashing a part or chapter trashes its descendants.
- Items can be **archived** (`archivedAt`), viewed on an archive page, and unarchived.

## Data
- Nullable `trashedAt` / `archivedAt` timestamps on each entity (no separate tables), so restore is a single update.

## Routes
- `/projects/[projectId]/trash`
- `/projects/[projectId]/archive`

## Acceptance criteria
- Restoring a part/chapter restores its descendants.
- Trashed and archived items are excluded from normal lists and word counts.
- Permanent delete requires confirmation.
