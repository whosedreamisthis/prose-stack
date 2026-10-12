import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME, DEMO_UNAVAILABLE_MESSAGE } from "@/lib/demo-config";
import { signDemoCookie } from "@/lib/demo-cookie";
import { clientIp } from "@/lib/demo-ip";
import { startDemo } from "@/lib/demo";

/**
 * Creates the caller's demo, or signs them back into the one they already have. Answers with a one-use sign-in ticket
 * the browser redeems with Clerk; the resume cookie is set here so a changed IP can still find the same demo (a cookie
 * for a demo that has ended is simply replaced by the new demo's).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.DEMO_COOKIE_SECRET;
  if (!secret) {
    console.error("DEMO_COOKIE_SECRET is not set; demos are disabled.");
    return NextResponse.json({ error: DEMO_UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  const result = await startDemo({
    ip: clientIp(request.headers),
    cookieValue: request.cookies.get(DEMO_COOKIE_NAME)?.value,
    secret,
  });

  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  const response = NextResponse.json({ ticket: result.ticket });
  response.cookies.set(DEMO_COOKIE_NAME, signDemoCookie(result.clerkId, result.expiresAt, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: result.expiresAt,
  });
  return response;
}
