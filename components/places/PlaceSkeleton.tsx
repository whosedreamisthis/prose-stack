import { PLACE_FIELDS } from "@/lib/place-config";

const bar = "animate-pulse rounded-lg bg-muted motion-reduce:animate-none";

/** Placeholder with the same layout as the place card: name, the short fields in two columns, then the long ones. */
export function PlaceSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4" role="status" aria-label="Loading place">
      <div className="flex flex-col gap-1.5">
        <div className={`${bar} h-4 w-12`} />
        <div className={`${bar} h-10`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PLACE_FIELDS.filter((f) => f.short).map(({ key }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className={`${bar} h-4 w-16`} />
            <div className={`${bar} h-8`} />
          </div>
        ))}
      </div>
      {PLACE_FIELDS.filter((f) => !f.short).map(({ key }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <div className={`${bar} h-4 w-24`} />
          <div className={`${bar} h-16`} />
        </div>
      ))}
    </div>
  );
}
