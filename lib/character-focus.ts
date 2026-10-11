let requestedId: string | null = null;

/** Asks the sketch of this character to mount with its name focused. Called when the writer adds a character. */
export function requestNameFocus(characterId: string) {
  requestedId = characterId;
}

/** True once per request, so a plain page load, reload or a click on an existing character never steals focus. */
export function consumeNameFocusRequest(characterId: string) {
  const was = requestedId === characterId;
  requestedId = null;
  return was;
}
