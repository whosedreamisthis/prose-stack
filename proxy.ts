import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/register(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/demo",
  "/api/cron/cleanup-demos", // checks CRON_SECRET itself
  "/api/demo/expired",
  "/api/uploadthing", // the file router checks the user itself; UploadThing's signed callback has no session
]);

export default clerkMiddleware(async (auth, req) => {
  if (req.nextUrl.pathname === "/") {
    // Signed-in visitors skip the landing page; /continue picks their last-opened project.
    const { userId } = await auth();
    if (userId) return NextResponse.redirect(new URL("/continue", req.url));
  }
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
