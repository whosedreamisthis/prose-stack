/** Requests seen per key in the current window. Held in memory: it only has to blunt a runaway client, not be exact across servers. */
const hits = new Map<string, number[]>();

const WINDOW_MS = 60_000;

/** True when `key` may make another request now, and counts it. At most `limit` requests per minute. */
export function allowRequest(key: string, limit: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Keep the map from growing without bound: forget keys that have gone quiet.
  if (hits.size > 5_000) for (const [k, times] of hits) if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(k);
  return true;
}

/** For tests. */
export function resetRateLimits() {
  hits.clear();
}
