"use client";

import { FileDownIcon, SettingsIcon, SpellCheckIcon, type LucideIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { Hint } from "@/components/layout/Hint";
import { Button } from "@/components/ui/button";

// Disabled until spell check, PDF export and settings ship; each feature wires its own button.
const ACTIONS: { label: string; icon: LucideIcon }[] = [
  { label: "Spell check", icon: SpellCheckIcon },
  { label: "Export to PDF", icon: FileDownIcon },
  { label: "Settings", icon: SettingsIcon },
];

/** Project-only navbar actions; renders nothing outside /projects/[projectId]. */
export function ProjectNavActions() {
  const { projectId } = useParams<{ projectId?: string }>();
  if (!projectId) return null;

  return (
    <div className="flex items-center gap-1">
      {ACTIONS.map(({ label, icon: Icon }) => (
        <Hint key={label} label={`${label} (coming soon)`} disabled>
          <Button variant="ghost" size="default" disabled aria-label={label} className="disabled:opacity-70">
            <Icon className="size-5" />
            <span className="hidden lg:inline">{label}</span>
          </Button>
        </Hint>
      ))}
    </div>
  );
}
