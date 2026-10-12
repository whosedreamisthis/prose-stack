import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`cookie:${payload}`).digest("hex");
}

/** `clerkId.expiresAtMs.signature`: names the demo and when it ends, and can't be forged without the secret. */
export function signDemoCookie(clerkId: string, expiresAt: Date, secret: string) {
  const payload = `${clerkId}.${expiresAt.getTime()}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** The demo's Clerk id, or null when the value is malformed, tampered with or past its expiry. */
export function readDemoCookie(value: string | undefined, secret: string, now = new Date()): string | null {
  if (!value) return null;
  const [clerkId, expires, signature, ...rest] = value.split(".");
  if (!clerkId || !expires || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(`${clerkId}.${expires}`, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return null;
  return clerkId;
}
