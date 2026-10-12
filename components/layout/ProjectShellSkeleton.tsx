import { EditorSkeleton } from "@/components/manuscript/EditorSkeleton";

const bar = "animate-pulse rounded-md bg-muted motion-reduce:animate-none";

/** The project page's frame while it loads, from the Projects page: the toolbar strip, the sidebars and the editor, so it answers the click at once. */
export function ProjectShellSkeleton() {
  return (
    <div className="project-shell flex min-h-0 flex-1 flex-col" role="status" aria-label="Loading project">
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-2">
        <div className={`${bar} size-6`} />
        <div className={`${bar} size-6`} />
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-64 shrink-0 flex-col gap-2 border-r p-3 md:flex">
          <div className={`${bar} h-7 w-32`} />
          <div className={`${bar} ml-3 h-6 w-40`} />
          <div className={`${bar} ml-6 h-6 w-36`} />
          <div className={`${bar} ml-6 h-6 w-32`} />
          <div className={`${bar} mt-2 h-7 w-28`} />
          <div className={`${bar} mt-2 h-7 w-28`} />
          <div className={`${bar} mt-2 h-7 w-24`} />
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden">
          <EditorSkeleton />
        </main>
        <aside className="hidden w-72 shrink-0 flex-col gap-3 border-l p-3 lg:flex">
          <div className={`${bar} h-7 w-24`} />
          <div className={`${bar} h-20`} />
          <div className={`${bar} h-20`} />
        </aside>
      </div>
    </div>
  );
}
