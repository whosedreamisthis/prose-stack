import type { ReactNode } from "react";
import { BookAIcon, RedoIcon, SearchIcon, TypeIcon, UndoIcon, HeadphonesIcon, type LucideIcon } from "lucide-react";
import { Hint } from "@/components/layout/Hint";
import { Button } from "@/components/ui/button";

// Disabled until the editor features (undo/redo, find and replace, thesaurus, read aloud) ship.
const TOOLBAR: { label: string; icon: LucideIcon }[] = [
  { label: "Undo", icon: UndoIcon },
  { label: "Redo", icon: RedoIcon },
  { label: "Find and replace", icon: SearchIcon },
  { label: "Font size", icon: TypeIcon },
  { label: "Thesaurus", icon: BookAIcon },
  { label: "Read aloud", icon: HeadphonesIcon },
];

interface EditorColumnProps {
  /** The writing area. */
  children: ReactNode;
  /** The stats footer; defaults to a placeholder until word counts exist. */
  stats?: ReactNode;
}

export function EditorColumn({ children, stats }: EditorColumnProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="toolbar" aria-label="Editor tools" className="flex shrink-0 items-center gap-1 border-b px-3 py-2">
        {TOOLBAR.map(({ label, icon: Icon }) => (
          <Hint key={label} label={`${label} (coming soon)`} disabled>
            <Button variant="ghost" size="icon" disabled aria-label={label} className="disabled:opacity-70">
              <Icon className="size-5" />
            </Button>
          </Hint>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">{children}</div>

      <footer className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground">{stats ?? "Word count appears here"}</footer>
    </div>
  );
}
