let requestedId: string | null = null;

/** Asks the card of this place to mount with its name focused. Called when the writer adds a place. */
export function requestPlaceNameFocus(placeId: string) {
  requestedId = placeId;
}

/** True once per request, so a plain page load, reload or a click on an existing place never steals focus. */
export function consumePlaceNameFocusRequest(placeId: string) {
  const was = requestedId === placeId;
  requestedId = null;
  return was;
}
