# Spell Check — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Manuscript, §4 Tech Stack, §10 UI / UX, §12 Open Questions.

## Summary

Spell checking in the scene editor, toggled from the top navbar. Misspelled words are underlined, and hovering one shows replacement options.

## Decisions

- **`nspell` with the English (`dictionary-en`) Hunspell dictionary.** Native browser spellcheck cannot show suggestions on hover (pages get no access to the browser's words or suggestions), so the editor draws its own underlines.
- **Native spellcheck is the fallback** while the dictionary loads or if it fails to load.
- **Persistence**: toggle per user, stored in `localStorage` (not per project).
- **Default**: on for new users.
- **Custom words**: "Add to dictionary" is kept in `localStorage` for this browser.

## Requirements

- A toggle in the top navbar on project pages: icon button with an accessible label, `aria-pressed`, a tinted background with accent-colored icon and text when on, and a grayed-out icon and text when off.
- A Tiptap extension underlines misspelled words (wavy, destructive color) using decorations. It rescans after typing pauses, and skips the word the caret is still typing.
- Skipped: single letters, ALL CAPS words, anything with digits. Apostrophes (straight or curly) stay inside words; hyphenated words are checked per part.
- Hovering an underlined word (after a short delay) opens a popover under it with up to 5 suggestions, matching the word's capital letter, plus **Add to dictionary** and **Ignore** (this session). Clicking a suggestion replaces the word.
- Keyboard route: Ctrl/Cmd+. with the caret in a misspelled word opens the same popover. Arrow keys move through it and Escape closes it.
- The dictionary files are served from `/dictionaries/en/` and fetched on first use; checking runs in the browser.
- Applies only to the scene editor, including the embedded chapter, part and full manuscript views. Works the same for the demo user.
- Turning the toggle off removes the underlines immediately. Editor content, selection and cursor are never affected, and decorations do not trigger autosave.
- Wrap `localStorage` access in try/catch so everything works when storage is unavailable.

## Acceptance criteria

- Toggling on/off takes effect immediately without losing editor content or cursor.
- The setting persists across reloads and across projects for the same browser.
- A new user sees spell check on.
- Hovering a misspelled word shows suggestions; choosing one replaces the word in place and is undoable.
- Added words are not flagged again after a reload; ignored words are not flagged until reload.
- The on and off states of the navbar button are easy to tell apart.

## Limitations

- English only.
- The dictionary is about 0.5 MB, downloaded once and cached by the browser.
- Suggestions come from Hunspell rules and can be less accurate than the browser's.

## Out of scope

- Grammar checking.
- Other languages.
- Per-project or server-synced custom dictionaries.
- Automatically treating character and place names as known words.

## Future

- Add character and place names to the dictionary automatically.
- Language choice.
