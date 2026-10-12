import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { PendingSwitch } from "@/components/layout/PendingSwitch";
import { PlaceCard } from "@/components/places/PlaceCard";
import { PlaceSkeleton } from "@/components/places/PlaceSkeleton";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { getCurrentUser } from "@/lib/auth";
import { listCharacters } from "@/lib/characters";
import { resolveActivePlace } from "@/lib/place-selection";
import { getPlace, listPlaces } from "@/lib/places";
import { getProject } from "@/lib/projects";

type PageParams = PageProps<"/projects/[projectId]/places">;

async function PlaceLoader({ params, searchParams }: { params: PageParams["params"]; searchParams: PageParams["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const requested = Array.isArray(query.place) ? query.place[0] : query.place;
  // The requested place is fetched alongside the list instead of after it: one round trip, not two. When the id is
  // missing or stale, the list decides which place to show and that one is fetched next.
  const [project, places, characters, requestedPlace] = await Promise.all([
    getProject(user.id, projectId),
    listPlaces(user.id, projectId),
    listCharacters(user.id, projectId),
    requested ? getPlace(user.id, projectId, requested) : null,
  ]);
  if (!project) notFound();

  const active = resolveActivePlace(places, requested);
  const place = requestedPlace ?? (active ? await getPlace(user.id, projectId, active.id) : null);

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      {place ? (
        <PlaceCard key={place.id} projectId={projectId} place={place} characters={characters} />
      ) : (
        <div className="mx-auto flex max-w-md flex-col gap-2 pt-16 text-center">
          <h1 className="text-xl font-semibold">No places yet</h1>
          <p className="text-sm text-muted-foreground">Use the + in the Places section of the sidebar to add your first place.</p>
        </div>
      )}
    </>
  );
}

export default function PlacesPage(props: PageParams) {
  return (
    <PendingSwitch kind="place" fallback={<PlaceSkeleton />}>
      <Suspense fallback={<PlaceSkeleton />}>
        <PlaceLoader params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </PendingSwitch>
  );
}
