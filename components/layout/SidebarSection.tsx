"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";

interface SidebarSectionProps {
  /** The section's route segment under the project, e.g. "characters". Also its key in the store. */
  slug: string;
  label: string;
  children: ReactNode;
}

/**
 * One collapsible section of the project sidebar. Opening a section from its header also goes to it; arriving at its
 * route by any other means (a link, back/forward) opens it. Open state lives in the layout store, so it survives the
 * sidebar being re-rendered by a navigation.
 */
export function SidebarSection({ slug, label, children }: SidebarSectionProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const open = useLayoutStore((s) => s.sectionsOpen[slug] ?? false);
  const setSectionOpen = useLayoutStore((s) => s.setSectionOpen);
  const setPending = usePendingNavStore((s) => s.setPending);

  const href = `/projects/${projectId}/${slug}`;
  const active = pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (active) setSectionOpen(slug, true);
  }, [active, slug, setSectionOpen]);

  const Chevron = open ? ChevronDownIcon : ChevronRightIcon;
  const bodyId = `sidebar-section-${slug}`;

  return (
    <section aria-label={label} className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => {
          setSectionOpen(slug, !open);
          if (!open && !active) {
            setPending("section", slug);
            router.push(href);
          }
        }}
        className="group/row flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-primary outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Chevron className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </button>
      <div id={bodyId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
