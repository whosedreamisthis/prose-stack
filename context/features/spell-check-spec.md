# Spell Check — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Manuscript, §4 Tech Stack, §10 UI / UX, §12 Open Questions.

## Summary

Spell checking in the scene editor, toggled from the top navbar.

## Requirements
- Toggle in the top navbar; applies to the scene editor.
- Start with **native browser spellcheck** (`spellcheck` attribute on the Tiptap editor element).
- Swap to `nspell` only if more control is needed (custom dictionary, character and place names).

## Acceptance criteria
- Toggling on/off takes effect immediately without losing editor content or cursor.
- Setting persists (decide: per user via localStorage, or per project).

## Open questions
- Native or `nspell`?
- Should character/place names be added to a custom dictionary? (Requires `nspell`.)
