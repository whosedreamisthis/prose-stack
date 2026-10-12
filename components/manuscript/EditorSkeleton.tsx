/** Placeholder for the scene editor: the scene's name, then the body. */
export function EditorSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4" role="status" aria-label="Loading scene">
      <div className="h-8 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-[60vh] animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
    </div>
  );
}
