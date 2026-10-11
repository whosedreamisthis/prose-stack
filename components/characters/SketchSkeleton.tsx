import { SKETCH_FIELDS } from "@/lib/character-config";

const bar = "animate-pulse rounded-lg bg-muted motion-reduce:animate-none";

/** Placeholder with the same layout as the sketch: name and group, the short fields in two columns, then the long ones. */
export function SketchSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4" role="status" aria-label="Loading character">
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className={`${bar} h-4 w-12`} />
          <div className={`${bar} h-10`} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className={`${bar} h-4 w-12`} />
          <div className={`${bar} h-10 w-28`} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {SKETCH_FIELDS.filter((f) => f.short).map(({ key }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className={`${bar} h-4 w-16`} />
            <div className={`${bar} h-8`} />
          </div>
        ))}
      </div>
      {SKETCH_FIELDS.filter((f) => !f.short).map(({ key }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <div className={`${bar} h-4 w-24`} />
          <div className={`${bar} h-16`} />
        </div>
      ))}
    </div>
  );
}
