"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

/** Where a demo whose time is up lands. It ends the session so the visitor isn't stuck signed in to a dead account. */
export default function DemoExpiredPage() {
  const { signOut } = useClerk();

  useEffect(() => {
    void signOut({ redirectUrl: "/" });
  }, [signOut]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-xl font-semibold">Your demo has ended</h1>
      <p className="text-sm text-muted-foreground">Demo data is deleted after 12 hours. Taking you back to the start…</p>
    </main>
  );
}
