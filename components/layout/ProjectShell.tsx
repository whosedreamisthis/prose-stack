"use client";

import type { ReactNode } from "react";
import { PanelLeftIcon, PanelRightIcon } from "lucide-react";
import { Hint } from "@/components/layout/Hint";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { cn } from "@/lib/utils";

interface ProjectShellProps {
  left: ReactNode;
  right: ReactNode;
  /** Page-specific tools, centered above the main pane so they line up with the writing area. */
  toolbar: ReactNode;
  children: ReactNode;
}

export function ProjectShell({ left, right, toolbar, children }: ProjectShellProps) {
  const leftOpen = useLayoutStore((s) => s.leftOpen);
  const rightOpen = useLayoutStore((s) => s.rightOpen);
  const hasRightPanel = useLayoutStore((s) => s.hasRightPanel);
  const drawerOpen = useLayoutStore((s) => s.drawerOpen);
  const toggleLeft = useLayoutStore((s) => s.toggleLeft);
  const toggleRight = useLayoutStore((s) => s.toggleRight);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-2">
        {/* Small screens open the drawer; larger screens collapse the sidebar. Both are CSS-switched, so no viewport detection runs on the client. */}
        <Hint label="Open sidebar" side="right" wrapperClassName="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open sidebar"
            aria-expanded={drawerOpen}
            aria-controls="left-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <PanelLeftIcon className="size-5" />
          </Button>
        </Hint>
        <Hint label={leftOpen ? "Collapse left sidebar" : "Expand left sidebar"} side="right" wrapperClassName="hidden md:inline-flex">
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            aria-label={leftOpen ? "Collapse left sidebar" : "Expand left sidebar"}
            aria-expanded={leftOpen}
            aria-controls="left-sidebar"
            onClick={toggleLeft}
          >
            <PanelLeftIcon className="size-5" />
          </Button>
        </Hint>
        <Hint
          label={hasRightPanel ? (rightOpen ? "Collapse right sidebar" : "Expand right sidebar") : "No panel on this page"}
          side="left"
          disabled={!hasRightPanel}
          wrapperClassName="hidden lg:inline-flex"
        >
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            disabled={!hasRightPanel}
            aria-label={rightOpen ? "Collapse right sidebar" : "Expand right sidebar"}
            aria-expanded={hasRightPanel && rightOpen}
            aria-controls="right-sidebar"
            onClick={toggleRight}
          >
            <PanelRightIcon className="size-5" />
          </Button>
        </Hint>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          id="left-sidebar"
          inert={!leftOpen}
          className={cn(
            "hidden shrink-0 overflow-hidden border-r transition-[width] duration-200 motion-reduce:transition-none md:block",
            leftOpen ? "w-64" : "w-0 border-r-0",
          )}
        >
          <div className="h-full w-64 overflow-y-auto p-3">{left}</div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {/* Centered over the main pane, so it lines up with the writing area whichever sidebars are open. Empty (and hidden) on pages with no tools. */}
          <div className="flex shrink-0 justify-center border-b px-3 py-2 empty:hidden">{toolbar}</div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </main>

        <aside
          id="right-sidebar"
          inert={!rightOpen}
          className={cn(
            "hidden shrink-0 overflow-hidden border-l transition-[width] duration-200 motion-reduce:transition-none lg:block",
            hasRightPanel && rightOpen ? "w-72" : "w-0 border-l-0",
          )}
        >
          <div className="h-full w-72 overflow-y-auto p-3">{right}</div>
        </aside>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent id="left-drawer" side="left" className="w-72 md:hidden">
          <SheetHeader>
            <SheetTitle>Project</SheetTitle>
            <SheetDescription className="sr-only">Sidebar navigation for this project</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">{left}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
