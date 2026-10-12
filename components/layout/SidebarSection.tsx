"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";

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
  /** Expanding the section from its header also opens its page (`/projects/<id>/<slug>`); collapsing only collapses. */
  opensPage?: boolean;
  children: ReactNode;
}

/**
 * One collapsible section of the project sidebar. Its header expands and collapses it (and, with `opensPage`, opens its page
 * when expanding); arriving at its route (a link, back/forward) opens it. Open state lives in the layout store, so it survives the
 * sidebar being re-rendered by a navigation.
 */
export function SidebarSection({ slug, label, action, icon, alsoOpenOn = [], nested = false, opensPage = false, children }: SidebarSectionProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const setPending = usePendingNavStore((s) => s.setPending);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const open = useLayoutStore((s) => s.sectionsOpen[slug] ?? false);
  const setSectionOpen = useLayoutStore((s) => s.setSectionOpen);

  const active = [slug, ...alsoOpenOn].some((segment) => {
    const href = `/projects/${projectId}/${segment}`;
    return pathname === href || pathname.startsWith(`${href}/`);
  });

  useEffect(() => {
    if (active) setSectionOpen(slug, true);
  }, [active, slug, setSectionOpen]);

  // Opening a section from its header scrolls the sidebar just enough to show all of it (its top, if it is taller).
  const sectionRef = useRef<HTMLElement>(null);
  const revealOnOpen = useRef(false);
  useEffect(() => {
    if (!open || !revealOnOpen.current) return;
    revealOnOpen.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sectionRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [open]);

  const Chevron = open ? ChevronDownIcon : ChevronRightIcon;
  const bodyId = `sidebar-section-${slug}`;

  return (
    <section ref={sectionRef} aria-label={label} className="flex flex-col gap-1">
      <div className="group/header relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => {
            revealOnOpen.current = !open;
            setSectionOpen(slug, !open);
            // Expanding goes to the section's page too, unless it is already on it (an open item stays open).
            if (opensPage && !open && !active) {
              setPending("section", slug);
              setDrawerOpen(false);
              router.push(`/projects/${projectId}/${slug}`);
            }
          }}
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
        {action && (
          // Like the outline's "…": shown on hover or keyboard focus, while its menu is open, and always on touch screens.
          <div className="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 group-hover/header:opacity-100 group-has-[:focus-visible]/header:opacity-100 has-[[data-popup-open]]:opacity-100 pointer-coarse:opacity-100">
            {action}
          </div>
        )}
      </div>
      <div id={bodyId} hidden={!open} className={cn(nested && "pl-3")}>
        {children}
      </div>
    </section>
  );
}
