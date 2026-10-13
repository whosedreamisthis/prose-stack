"use client";

import { useSyncExternalStore } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEMO_UNAVAILABLE_MESSAGE } from "@/lib/demo-config";
import { cn } from "@/lib/utils";

// Module-level so "Starting demo…" survives the button remounting when Clerk's session change refreshes the page.
let busy = false;
const listeners = new Set<() => void>();
function setBusy(value: boolean) {
  busy = value;
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Asks the server for the visitor's demo (a new one, or the one their IP already has) and signs in with the one-use
 * ticket it returns. No credentials are involved.
 */
export function TryDemoButton({ className }: { className?: string }) {
  const { signIn } = useSignIn();
  const router = useRouter();
  const isBusy = useSyncExternalStore(subscribe, () => busy, () => false);

  async function start() {
    setBusy(true);
    try {
      const response = await fetch("/api/demo", { method: "POST" });
      const body = (await response.json().catch(() => null)) as { ticket?: string; error?: string } | null;
      if (!response.ok || !body?.ticket) {
        toast.error(body?.error ?? DEMO_UNAVAILABLE_MESSAGE);
        setBusy(false);
        return;
      }

      const { error } = await signIn.ticket({ ticket: body.ticket });
      if (error || signIn.status !== "complete") {
        toast.error("Could not sign in to the demo. Please try again.");
        setBusy(false);
        return;
      }
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/projects");
          if (url.startsWith("http")) window.location.href = url;
          else router.push(url);
        },
      });
      // Stay busy on success: the page is navigating away, so resetting would flash "Try demo" again.
      return;
    } catch {
      toast.error("Could not start the demo. Please try again.");
    }
    setBusy(false);
  }

  return (
    <Button
      type="button"
      size="lg"
      disabled={isBusy}
      onClick={start}
      // The ProseStack indigo, the same as the logo's mark.
      className={cn("bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400", className)}
    >
      {isBusy ? "Starting demo…" : "Try demo"}
    </Button>
  );
}
