import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NotesSkeleton } from "@/components/characters/NotesSkeleton";
import { PendingSwitch } from "@/components/layout/PendingSwitch";
import { PlaceNotesPanel } from "@/components/places/PlaceNotesPanel";
import { getCurrentUser } from "@/lib/auth";
import { resolveActivePlace } from "@/lib/place-selection";
import { listPlaceNotes, listPlaces } from "@/lib/places";

type SlotProps = PageProps<"/projects/[projectId]/places">;

async function NotesLoader({ params, searchParams }: { params: SlotProps["params"]; searchParams: SlotProps["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const requested = Array.isArray(query.place) ? query.place[0] : query.place;
  // Notes are fetched alongside the list (one round trip). They are scoped to the user's own, live places, so a stale
  // id just returns nothing and the list's pick is fetched instead.
  const [places, requestedNotes] = await Promise.all([
    listPlaces(user.id, projectId),
    requested ? listPlaceNotes(user.id, projectId, requested) : null,
  ]);
  const active = resolveActivePlace(places, requested);
  if (!active) return null;

  const notes = requestedNotes && active.id === requested ? requestedNotes : await listPlaceNotes(user.id, projectId, active.id);
  return <PlaceNotesPanel key={active.id} projectId={projectId} placeId={active.id} notes={notes} />;
}

export default function PlaceNotesSlot(props: SlotProps) {
  return (
    <PendingSwitch kind="place" fallback={<NotesSkeleton title="Place details" />}>
      <Suspense fallback={<NotesSkeleton title="Place details" />}>
        <NotesLoader params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </PendingSwitch>
  );
}
