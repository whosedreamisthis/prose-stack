const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "Oct 12, 2026". UTC, so the server render and the browser always print the same day. */
export function formatItemDate(ms: number) {
  return formatter.format(new Date(ms));
}
