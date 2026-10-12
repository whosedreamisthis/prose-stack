"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/lib/stores/layout-store";

interface SidebarSectionProps {
  /** The section's route segment under the project, e.g. "characters". Also its key in the store. */
  slug: string;
  label: string;
  /** A control shown at the right of the header, such as an add button. It stays usable while the section is collapsed. */
  action?: ReactNode;
  /** Shown before the label (a size-4 icon). */
  icon?: ReactNode;
  /** Other route segments that also open this section, for a section that groups others (Utilities holds Archive and Trash). */
  alsoOpenOn?: string[];
  /** A section inside another one: a plain row instead of an accent header. */
  nested?: boolean;
  children: ReactNode;
}

/**
 * One collapsible section of the project sidebar. Its header only expands and collapses it; arriving at its route (a link,
 * back/forward) opens it. Open state lives in the layout store, so it survives the
 * sidebar being re-rendered by a navigation.
 */
export function SidebarSection({ slug, label, action, icon, alsoOpenOn = [], nested = false, children }: SidebarSectionProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const open = useLayoutStore((s) => s.sectionsOpen[slug] ?? false);
  const setSectionOpen = useLayoutStore((s) => s.setSectionOpen);

  const active = [slug, ...alsoOpenOn].some((segment) => {
    const href = `/projects/${projectId}/${segment}`;
    return pathname === href || pathname.startsWith(`${href}/`);
  });

  useEffect(() => {
    if (active) setSectionOpen(slug, true);
  }, [active, slug, setSectionOpen]);

  const Chevron = open ? ChevronDownIcon : ChevronRightIcon;
  const bodyId = `sidebar-section-${slug}`;

  return (
    <section aria-label={label} className="flex flex-col gap-1">
      <div className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setSectionOpen(slug, !open)}
          className={cn(
            "group/row flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            nested ? "font-medium text-foreground/80" : "font-semibold text-primary",
          )}
        >
          {icon ? (
            // Like the outline's rows: the icon, swapped for the chevron on hover or focus to show what a click does.
            <span className="relative size-4 shrink-0" aria-hidden>
              <span className="absolute inset-0 group-hover/row:opacity-0 group-focus-visible/row:opacity-0 [&>svg]:size-4">{icon}</span>
              <Chevron className="absolute inset-0 size-4 opacity-0 group-hover/row:opacity-100 group-focus-visible/row:opacity-100" />
            </span>
          ) : (
            <Chevron className="size-4 shrink-0" aria-hidden />
          )}
          <span className="truncate">{label}</span>
        </button>
        {action && <div className="absolute top-1/2 right-1 -translate-y-1/2">{action}</div>}
      </div>
      <div id={bodyId} hidden={!open} className={cn(nested && "pl-3")}>
        {children}
      </div>
    </section>
  );
}
