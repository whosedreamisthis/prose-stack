# Read Aloud — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Manuscript, §4 Tech Stack (Read aloud: Web Speech API), §10 Editor toolbar. Related: [manuscript-spec.md](manuscript-spec.md).

## Summary

A **Read aloud** button in the scene editor toolbar that speaks the scene text back to the writer.

## Approach

No library needed. The browser's built-in **Web Speech API** (`window.speechSynthesis` and `SpeechSynthesisUtterance`) does text-to-speech. It is free, needs no API key, and runs on the client.

- `speechSynthesis.speak(utterance)` queues text to be spoken.
- `pause()`, `resume()` and `cancel()` control playback.
- `getVoices()` lists the voices installed on the user's device (varies by browser and OS).

## Requirements
- **Read aloud** button in the editor toolbar (after thesaurus).
- Click to start reading the current scene; the button toggles to **Pause**; a **Stop** control cancels.
- If text is selected in the editor, read only the selection; otherwise read the whole scene.
- Extract plain text from the Tiptap document, then split into sentence/paragraph chunks and queue one utterance per chunk (long single utterances can be cut off in some browsers, notably Chrome).
- Stop reading when the user switches scenes, leaves the page, or starts typing.
- Hide or disable the button, with a tooltip, if `speechSynthesis` is not supported.

## Nice to have (not first version)
- Highlight the sentence currently being read (`onboundary` / per-chunk `onstart`).
- Voice picker and speed (`rate`) setting, remembered per user.

## Data
- None in the first version. Voice and speed, if added later, could live in localStorage.

## State
- Playback state (idle / speaking / paused) in a small **Zustand** store so the toolbar and any highlighting stay in sync.

## Acceptance criteria
- Clicking Read aloud speaks the scene; Pause and Stop work.
- Switching scenes or navigating away cancels speech (no audio leaks).
- Long scenes (thousands of words) read through without cutting off.
- Unsupported browsers show a disabled button, not an error.
- A unit test covers the text extraction and chunking helper.

## Open questions
- Highlight the current sentence in the first version?
- Voice and speed controls now or later?
