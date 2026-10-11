import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookAIcon,
  ChevronRightIcon,
  RedoIcon,
  SearchIcon,
  TypeIcon,
  UndoIcon,
  Volume2Icon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Breadcrumb {
  label: string;
  href?: string;
}

// Disabled until the editor features (undo/redo, find and replace, thesaurus, read aloud) ship.
const TOOLBAR: { label: string; icon: LucideIcon }[] = [
  { label: "Undo", icon: UndoIcon },
  { label: "Redo", icon: RedoIcon },
  { label: "Find and replace", icon: SearchIcon },
  { label: "Font size", icon: TypeIcon },
  { label: "Thesaurus", icon: BookAIcon },
  { label: "Read aloud", icon: Volume2Icon },
];

interface EditorColumnProps {
  breadcrumbs: Breadcrumb[];
  /** The writing area. */
  children: ReactNode;
  /** The stats footer; defaults to a placeholder until word counts exist. */
  stats?: ReactNode;
}

export function EditorColumn({ breadcrumbs, children, stats }: EditorColumnProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Breadcrumb" className="flex shrink-0 items-center gap-1 px-4 pt-3 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRightIcon className="size-3.5" aria-hidden />}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current={i === breadcrumbs.length - 1 ? "page" : undefined} className="text-foreground">
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div role="toolbar" aria-label="Editor tools" className="flex shrink-0 items-center gap-1 border-b px-3 py-2">
        {TOOLBAR.map(({ label, icon: Icon }) => (
          <Button key={label} variant="ghost" size="icon" disabled aria-label={label} title={`${label} (coming soon)`} className="disabled:opacity-70">
            <Icon className="size-5" />
          </Button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">{children}</div>

      <footer className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground">{stats ?? "Word count appears here"}</footer>
    </div>
  );
}
