import type { ReactNode } from "react";

interface EditorColumnProps {
  /** The writing area. */
  children: ReactNode;
  /** The stats footer; defaults to a placeholder until word counts exist. */
  stats?: ReactNode;
}

/** The writing area and its stats footer. The editor's tools sit above it (see EditorToolbar). */
export function EditorColumn({ children, stats }: EditorColumnProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">{children}</div>

      <footer className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground">{stats ?? "Word count appears here"}</footer>
    </div>
  );
}
