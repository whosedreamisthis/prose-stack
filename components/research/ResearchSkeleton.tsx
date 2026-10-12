const bar = "animate-pulse rounded-lg bg-muted motion-reduce:animate-none";

/** Placeholder with the item view's layout: title, the text, then the story link. */
export function ResearchSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4" role="status" aria-label="Loading research">
      <div className={`${bar} h-10`} />
      <div className={`${bar} h-[50vh]`} />
      <div className={`${bar} h-8 w-56`} />
    </div>
  );
}
