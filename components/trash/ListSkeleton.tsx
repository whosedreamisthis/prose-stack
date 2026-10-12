const bar = "animate-pulse rounded-lg bg-muted motion-reduce:animate-none";

/** Placeholder with the layout of the Trash and Archive pages: a heading, a line of text and a few rows. */
export function ListSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4" role="status" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <div className={`${bar} h-7 w-24`} />
        <div className={`${bar} h-4 w-3/4`} />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${bar} h-16`} />
      ))}
    </div>
  );
}
