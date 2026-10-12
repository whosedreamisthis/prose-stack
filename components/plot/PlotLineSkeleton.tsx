const bar = "animate-pulse rounded-lg bg-muted motion-reduce:animate-none";

/** Placeholder for one plot line: its name, then a few cards joined by a connector. */
export function PlotLineSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-stretch p-4" role="status" aria-label="Loading plot line">
      <div className={`${bar} mb-4 h-7 w-40`} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col items-stretch">
          {i > 0 && <div className="mx-auto h-6 w-6 bg-muted" aria-hidden />}
          <div className={`${bar} h-32`} />
        </div>
      ))}
    </div>
  );
}
