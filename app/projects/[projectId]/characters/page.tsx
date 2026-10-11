import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { CharacterSketch } from "@/components/characters/CharacterSketch";
import { SketchSkeleton } from "@/components/characters/SketchSkeleton";
import { PendingSwitch } from "@/components/layout/PendingSwitch";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { getCurrentUser } from "@/lib/auth";
import { resolveActiveCharacter } from "@/lib/character-selection";
import { getCharacter, listCharacters } from "@/lib/characters";
import { getProject } from "@/lib/projects";

type PageParams = PageProps<"/projects/[projectId]/characters">;

async function SketchLoader({ params, searchParams }: { params: PageParams["params"]; searchParams: PageParams["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const requested = Array.isArray(query.character) ? query.character[0] : query.character;
  // The requested character is fetched alongside the list instead of after it: one round trip, not two. When the id is
  // missing or stale, the list decides which character to show and that one is fetched next.
  const [project, characters, requestedCharacter] = await Promise.all([
    getProject(user.id, projectId),
    listCharacters(user.id, projectId),
    requested ? getCharacter(user.id, projectId, requested) : null,
  ]);
  if (!project) notFound();

  const active = resolveActiveCharacter(characters, requested);
  const character = requestedCharacter ?? (active ? await getCharacter(user.id, projectId, active.id) : null);

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      {character ? (
        <CharacterSketch key={character.id} projectId={projectId} character={character} />
      ) : (
        <div className="mx-auto flex max-w-md flex-col gap-2 pt-16 text-center">
          <h1 className="text-xl font-semibold">No characters yet</h1>
          <p className="text-sm text-muted-foreground">Use the + beside Main or Supporting in the sidebar to add your first character.</p>
        </div>
      )}
    </>
  );
}

export default function CharactersPage(props: PageParams) {
  return (
    <PendingSwitch kind="character" fallback={<SketchSkeleton />}>
      <Suspense fallback={<SketchSkeleton />}>
        <SketchLoader params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </PendingSwitch>
  );
}
