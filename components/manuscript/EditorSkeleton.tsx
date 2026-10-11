/** Placeholder for the scene editor: a title and a few lines of text. */
export function EditorSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4" role="status" aria-label="Loading scene">
      <div className="h-8 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      {[100, 95, 100, 80, 90].map((w, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-muted motion-reduce:animate-none" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
