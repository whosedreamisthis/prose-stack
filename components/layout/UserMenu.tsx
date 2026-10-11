"use client";

import { useSyncExternalStore } from "react";
import { Show, UserButton } from "@clerk/nextjs";

const subscribe = () => () => {};

/**
 * Clerk's account button. It renders in the browser only: the server HTML and the first client render both show the
 * same placeholder, so hydration cannot disagree about the container Clerk mounts into.
 */
export function UserMenu() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <div className="size-7 rounded-full bg-muted" aria-hidden />;
  return (
    <Show when="signed-in">
      <UserButton />
    </Show>
  );
}
