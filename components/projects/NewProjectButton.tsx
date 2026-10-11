"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROJECT_LIMIT_MESSAGE } from "@/lib/project-config";
import { useProjectStore } from "@/lib/stores/project-store";

export function NewProjectButton({ atLimit }: { atLimit: boolean }) {
  const setNewProjectOpen = useProjectStore((s) => s.setNewProjectOpen);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button disabled={atLimit} onClick={() => setNewProjectOpen(true)}>
        <PlusIcon /> New project
      </Button>
      {atLimit && <p className="text-xs text-muted-foreground">{PROJECT_LIMIT_MESSAGE}</p>}
    </div>
  );
}
