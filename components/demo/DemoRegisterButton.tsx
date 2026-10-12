"use client";

import { useClerk } from "@clerk/nextjs";

/** A demo can't become a real account, so registering means leaving the demo first. */
export function DemoRegisterButton() {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      onClick={() => void signOut({ redirectUrl: "/register" })}
      className="font-medium underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      Register to keep your work
    </button>
  );
}
