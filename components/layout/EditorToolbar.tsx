import { BookAIcon, HeadphonesIcon, RedoIcon, SearchIcon, TypeIcon, UndoIcon, type LucideIcon } from "lucide-react";
import { Hint } from "@/components/layout/Hint";
import { Button } from "@/components/ui/button";

// Disabled until the editor features (undo/redo, find and replace, thesaurus, read aloud) ship.
const TOOLS: { label: string; icon: LucideIcon }[] = [
  { label: "Undo", icon: UndoIcon },
  { label: "Redo", icon: RedoIcon },
  { label: "Find and replace", icon: SearchIcon },
  { label: "Font size", icon: TypeIcon },
  { label: "Thesaurus", icon: BookAIcon },
  { label: "Read aloud", icon: HeadphonesIcon },
];

/** The editor's tools. Rendered above the main pane (the `@toolbar` slot) and centered over it. */
export function EditorToolbar() {
  return (
    <div role="toolbar" aria-label="Editor tools" className="flex items-center gap-1">
      {TOOLS.map(({ label, icon: Icon }) => (
        <Hint key={label} label={`${label} (coming soon)`} disabled>
          <Button variant="ghost" size="icon" disabled aria-label={label} className="disabled:opacity-70">
            <Icon className="size-5" />
          </Button>
        </Hint>
      ))}
    </div>
  );
}
