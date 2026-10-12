/** How long a demo lives, and so how long its IP slot is held. */
export const DEMO_LIFETIME_SECONDS = 12 * 60 * 60;
export const DEMO_LIFETIME_MS = DEMO_LIFETIME_SECONDS * 1000;

export const DEMO_COOKIE_NAME = "prosestack_demo";

/**
 * Every Redis key this app writes starts with this. The Upstash database is shared with other projects (free tier), so
 * the prefix is what keeps them apart: we only ever SET NX EX, GET and DEL keys under it, never scan or flush.
 */
export const REDIS_PREFIX = "prosestack:demo:";

export const ipKey = (ipHash: string) => `${REDIS_PREFIX}ip:${ipHash}`;
/** Reverse lookup, so cleanup can free the IP slot of a demo it deletes. */
export const userKey = (clerkId: string) => `${REDIS_PREFIX}user:${clerkId}`;

/** An IP slot holds this (plus a random id) between being claimed and the demo's Clerk id being known. */
export const PENDING_PREFIX = "pending:";

/** Generated demo accounts use this domain, which also lets the orphan sweep find them in Clerk. */
export const DEMO_EMAIL_DOMAIN = "example.com";
export const DEMO_EMAIL_PREFIX = "demo-";

export const DEMO_UNAVAILABLE_MESSAGE = "Demos are temporarily unavailable, please try again shortly.";

/** A sign-in token is redeemed straight away, so it only needs to live a minute. */
export const SIGN_IN_TOKEN_SECONDS = 60;

/** A demo being created by a concurrent request is waited for this long (polling) before giving up. */
export const PENDING_WAIT_MS = 6000;
export const PENDING_POLL_MS = 250;

/** The banner shows time left in whole hours, never less than 1. */
export function hoursLeft(expiresAt: Date, now = new Date()) {
  return Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 3_600_000));
}
