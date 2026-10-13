/** Placeholder for the scene editor: the scene's name, then the body. `bodyOnly` is for when the name is already on the page. */
export function EditorSkeleton({ bodyOnly = false }: { bodyOnly?: boolean }) {
  if (bodyOnly) {
    return <div role="status" aria-label="Loading scene" className="h-[60vh] animate-pulse rounded-md bg-muted motion-reduce:animate-none" />;
  }
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4" role="status" aria-label="Loading scene">
      <div className="h-8 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-[60vh] animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
    </div>
  );
}
