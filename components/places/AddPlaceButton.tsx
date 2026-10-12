"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createPlace } from "@/actions/places";
import { Hint } from "@/components/layout/Hint";
import { Button } from "@/components/ui/button";
import { requestPlaceNameFocus } from "@/lib/place-focus";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";

/** The + in the Places section header: adds a place and opens it, with its name selected. */
export function AddPlaceButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const setPending = usePendingNavStore((s) => s.setPending);
  const setSectionOpen = useLayoutStore((s) => s.setSectionOpen);
  const [pending, startTransition] = useTransition();

  const add = () => {
    startTransition(async () => {
      const result = await createPlace({ projectId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      requestPlaceNameFocus(result.data.id);
      // The header's + works while the section is collapsed, so open it to show the new row.
      setSectionOpen("places", true);
      setPending("section", "places");
      router.push(`/projects/${projectId}/places?place=${result.data.id}`);
    });
  };

  return (
    <Hint label="Add place" side="right">
      <Button variant="ghost" size="icon-xs" disabled={pending} aria-label="Add place" onClick={add}>
        <PlusIcon />
      </Button>
    </Hint>
  );
}
