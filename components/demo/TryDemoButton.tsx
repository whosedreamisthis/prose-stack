"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEMO_UNAVAILABLE_MESSAGE } from "@/lib/demo-config";
import { cn } from "@/lib/utils";

/**
 * Asks the server for the visitor's demo (a new one, or the one their IP already has) and signs in with the one-use
 * ticket it returns. No credentials are involved.
 */
export function TryDemoButton({ className }: { className?: string }) {
  const { signIn } = useSignIn();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const response = await fetch("/api/demo", { method: "POST" });
      const body = (await response.json().catch(() => null)) as { ticket?: string; error?: string } | null;
      if (!response.ok || !body?.ticket) {
        toast.error(body?.error ?? DEMO_UNAVAILABLE_MESSAGE);
        return;
      }

      const { error } = await signIn.ticket({ ticket: body.ticket });
      if (error || signIn.status !== "complete") {
        toast.error("Could not sign in to the demo. Please try again.");
        return;
      }
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/projects");
          if (url.startsWith("http")) window.location.href = url;
          else router.push(url);
        },
      });
    } catch {
      toast.error("Could not start the demo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      disabled={busy}
      onClick={start}
      // The ProseStack indigo, the same as the logo's mark.
      className={cn("bg-indigo-500 text-white hover:bg-indigo-400", className)}
    >
      {busy ? "Starting demo…" : "Try demo"}
    </Button>
  );
}
