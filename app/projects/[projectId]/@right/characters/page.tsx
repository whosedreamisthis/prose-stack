import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CharacterNotesPanel } from "@/components/characters/CharacterNotesPanel";
import { NotesSkeleton } from "@/components/characters/NotesSkeleton";
import { PendingSwitch } from "@/components/layout/PendingSwitch";
import { getCurrentUser } from "@/lib/auth";
import { resolveActiveCharacter } from "@/lib/character-selection";
import { listCharacterNotes, listCharacters } from "@/lib/characters";

type SlotProps = PageProps<"/projects/[projectId]/characters">;

async function NotesLoader({ params, searchParams }: { params: SlotProps["params"]; searchParams: SlotProps["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const requested = Array.isArray(query.character) ? query.character[0] : query.character;
  // Notes are fetched alongside the list (one round trip). They are scoped to the user's own, live characters, so a
  // stale id just returns nothing and the list's pick is fetched instead.
  const [characters, requestedNotes] = await Promise.all([
    listCharacters(user.id, projectId),
    requested ? listCharacterNotes(user.id, projectId, requested) : null,
  ]);
  const active = resolveActiveCharacter(characters, requested);
  if (!active) return null;

  const notes = requestedNotes && active.id === requested ? requestedNotes : await listCharacterNotes(user.id, projectId, active.id);
  return <CharacterNotesPanel key={active.id} projectId={projectId} characterId={active.id} characterName={active.name} notes={notes} />;
}

export default function CharacterNotesSlot(props: SlotProps) {
  return (
    <PendingSwitch kind="character" fallback={<NotesSkeleton />}>
      <Suspense fallback={<NotesSkeleton />}>
        <NotesLoader params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </PendingSwitch>
  );
}
