const bar = "animate-pulse rounded-lg bg-muted motion-reduce:animate-none";

/** Placeholder with the grid's layout: a header row of plot lines and a few scene rows. */
export function PlotSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4" role="status" aria-label="Loading plot grid">
      <div className="flex gap-3">
        <div className={`${bar} h-8 w-44`} />
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${bar} h-8 w-56`} />
        ))}
      </div>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex gap-3">
          <div className={`${bar} h-12 w-44`} />
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${bar} h-12 w-56`} />
          ))}
        </div>
      ))}
    </div>
  );
}
