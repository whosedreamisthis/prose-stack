let requested = false;

/** Asks the next scene editor to mount with focus. Called when the writer explicitly opens or adds a scene. */
export function requestEditorFocus() {
  requested = true;
}

/** True once per request, so a plain page load or reload never steals focus. */
export function consumeEditorFocusRequest() {
  const was = requested;
  requested = false;
  return was;
}
