import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cleanupDemos } from "@/lib/demo-cleanup";

function authorized(request: NextRequest, secret: string) {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Deletes expired demos. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; nothing else may call it. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorized(request, secret)) return new Response("Unauthorized", { status: 401 });

  try {
    return NextResponse.json(await cleanupDemos());
  } catch (error) {
    console.error("Demo cleanup failed:", error);
    return new Response("Cleanup failed", { status: 500 });
  }
}
