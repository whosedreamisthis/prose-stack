import "server-only";
import { createHmac } from "node:crypto";

/**
 * The caller's IP from the proxy's headers. On Vercel `x-forwarded-for` is set by the platform (a client-sent value is
 * overwritten), so its first entry is the real client. In development there is no proxy, so a fixed address stands in;
 * in production a request without one is refused rather than guessed at.
 */
export function clientIp(headers: Headers, isProduction = process.env.NODE_ENV === "production"): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim();
  if (ip) return ip;
  return isProduction ? null : "127.0.0.1";
}

/**
 * A keyed hash of the IP: the raw address is never stored, and because the key is secret the hash can't be reversed by
 * hashing every possible IPv4 address.
 */
export function hashIp(ip: string, secret: string) {
  return createHmac("sha256", secret).update(`ip:${ip}`).digest("hex");
}
