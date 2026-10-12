"use client";

import { useEffect, type ReactNode } from "react";
import { PanelLeftIcon, PanelRightIcon } from "lucide-react";
import { Hint } from "@/components/layout/Hint";
import { PendingSection } from "@/components/layout/PendingSection";
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
  const rightDrawerOpen = useLayoutStore((s) => s.rightDrawerOpen);
  const setRightDrawerOpen = useLayoutStore((s) => s.setRightDrawerOpen);
  const toggleLeft = useLayoutStore((s) => s.toggleLeft);
  const toggleRight = useLayoutStore((s) => s.toggleRight);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);

  useEffect(() => {
    if (!rightDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setRightDrawerOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rightDrawerOpen, setRightDrawerOpen]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-2">
        <div className="flex items-center">
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
        </div>
        <div className="flex items-center">
          {/* Small screens open the sidebar as an overlay (closed by default); larger screens collapse it. Both are CSS-switched. */}
          <Hint
            label={hasRightPanel ? (rightDrawerOpen ? "Close right sidebar" : "Open right sidebar") : "No panel on this page"}
            side="left"
            disabled={!hasRightPanel}
            wrapperClassName="lg:hidden"
          >
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              disabled={!hasRightPanel}
              aria-label={rightDrawerOpen ? "Close right sidebar" : "Open right sidebar"}
              aria-expanded={hasRightPanel && rightDrawerOpen}
              aria-controls="right-sidebar"
              onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
            >
              <PanelRightIcon className="size-5" />
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
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside
          id="left-sidebar"
          inert={!leftOpen}
          className={cn(
            "hidden shrink-0 overflow-hidden border-r bg-primary/5 dark:bg-transparent transition-[width] duration-200 motion-reduce:transition-none md:block",
            leftOpen ? "w-64" : "w-0 border-r-0",
          )}
        >
          <div className="h-full w-64 overflow-y-auto p-3">{left}</div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {/* Centered over the main pane, so it lines up with the writing area whichever sidebars are open. Empty (and hidden) on pages with no tools. */}
          <div className="flex shrink-0 justify-center border-b px-3 py-2 empty:hidden">{toolbar}</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PendingSection>{children}</PendingSection>
          </div>
        </main>

        {/* One element, so the panel mounts once: an overlay below lg, an inline column from lg up. */}
        {rightDrawerOpen && (
          <button
            type="button"
            aria-label="Close right sidebar"
            tabIndex={-1}
            onClick={() => setRightDrawerOpen(false)}
            className="absolute inset-0 z-30 bg-black/10 lg:hidden"
          />
        )}
        <aside
          id="right-sidebar"
          className={cn(
            "shrink-0 overflow-hidden border-l bg-background transition-[width,transform] duration-200 motion-reduce:transition-none",
            "max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:w-72 max-lg:shadow-lg",
            !rightDrawerOpen && "max-lg:invisible max-lg:translate-x-full",
            hasRightPanel && rightOpen ? "lg:w-72" : "lg:invisible lg:w-0 lg:border-l-0",
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
