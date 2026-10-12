import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DEMO_COOKIE_NAME } from "@/lib/demo-config";
import { removeExpiredDemo } from "@/lib/demo-cleanup";

/**
 * Where a demo whose time is up lands. Deletes the demo (Clerk user, data, IP slot), clears the browser's session and
 * demo cookies, and sends the visitor to the landing page signed out.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (userId) {
    try {
      await removeExpiredDemo(userId);
    } catch (error) {
      // The daily cleanup job retries; the cookies are cleared either way so the visitor is not stuck.
      console.error("Expired demo removal failed:", error);
    }
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name === DEMO_COOKIE_NAME || cookie.name.startsWith("__session") || cookie.name.startsWith("__client_uat")) {
      response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
    }
  }
  return response;
}
