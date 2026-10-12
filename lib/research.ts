import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import type { DocNode } from "@/lib/manuscript-text";
import type { ResearchItemDetail, ResearchLibrary, ResearchLinkOptions, ResearchLinkTarget } from "@/types/research";

const live = { trashedAt: null, archivedAt: null } as const;

// These reads are cached until a Server Action in actions/research.ts (or a trash or restore of a linked character, place
// or scene) changes what they return (see lib/cache-tags.ts). The user id is an argument, so it is part of each cache key.

/** The project's live folders and items, for the sidebar tree. Empty when the project is not the user's. */
export async function getResearch(userId: string, projectId: string): Promise<ResearchLibrary> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.research(projectId), cacheTags.project(projectId));
  const owner = { projectId, project: { userId }, ...live };
  const [folders, items] = await Promise.all([
    prisma.researchFolder.findMany({
      where: owner,
      orderBy: { position: "asc" },
      select: { id: true, parentId: true, name: true, position: true },
    }),
    prisma.researchItem.findMany({
      // An item inside a hidden folder is hidden with it.
      where: { ...owner, OR: [{ folderId: null }, { folder: live }] },
      orderBy: { position: "asc" },
      select: {
        id: true,
        folderId: true,
        type: true,
        title: true,
        position: true,
      },
    }),
  ]);
  // Only NOTE and LINK exist until uploads ship; anything else is left out rather than shown half-working.
  return {
    folders,
    items: items.flatMap((i) => (i.type === "NOTE" || i.type === "LINK" ? [{ ...i, type: i.type }] : [])),
  };
}

/** One live item with its content and story link. Null when it is missing, hidden or not the user's. */
export async function getResearchItem(userId: string, projectId: string, itemId: string): Promise<ResearchItemDetail | null> {
  "use cache";
  cacheLife("days");
  // Also tagged with what it can link to: trashing a linked character, place or scene hides the chip.
  cacheTag(
    cacheTags.researchItem(itemId),
    cacheTags.research(projectId),
    cacheTags.characters(projectId),
    cacheTags.places(projectId),
    cacheTags.manuscript(projectId),
    cacheTags.project(projectId),
  );
  const row = await prisma.researchItem.findFirst({
    where: {
      id: itemId,
      projectId,
      project: { userId },
      ...live,
      OR: [{ folderId: null }, { folder: live }],
    },
    select: {
      id: true,
      folderId: true,
      type: true,
      title: true,
      position: true,
      content: true,
      url: true,
      description: true,
      character: {
        select: { id: true, name: true, trashedAt: true, archivedAt: true },
      },
      place: {
        select: { id: true, name: true, trashedAt: true, archivedAt: true },
      },
      scene: { select: { id: true, title: true, trashedAt: true } },
    },
  });
  if (!row || (row.type !== "NOTE" && row.type !== "LINK")) return null;

  let link: ResearchLinkTarget | null = null;
  if (row.character && !row.character.trashedAt && !row.character.archivedAt) {
    link = {
      kind: "character",
      id: row.character.id,
      name: row.character.name,
    };
  } else if (row.place && !row.place.trashedAt && !row.place.archivedAt) {
    link = { kind: "place", id: row.place.id, name: row.place.name };
  } else if (row.scene && !row.scene.trashedAt) {
    link = { kind: "scene", id: row.scene.id, name: row.scene.title };
  }

  return {
    id: row.id,
    folderId: row.folderId,
    type: row.type,
    title: row.title,
    position: row.position,
    content: (row.content as DocNode | null) ?? null,
    url: row.url ?? "",
    description: row.description ?? "",
    link,
  };
}

/** The live characters, places and scenes an item can link to. */
export async function getResearchLinkOptions(userId: string, projectId: string): Promise<ResearchLinkOptions> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.characters(projectId), cacheTags.places(projectId), cacheTags.manuscript(projectId), cacheTags.project(projectId));
  const owner = { projectId, project: { userId } };
  const [characters, places, scenes] = await Promise.all([
    prisma.character.findMany({
      where: { ...owner, ...live },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.place.findMany({
      where: { ...owner, ...live },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.manuscriptNode.findMany({
      where: { ...owner, type: "SCENE", trashedAt: null },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  return {
    characters,
    places,
    scenes: scenes.map((s) => ({ id: s.id, name: s.title })),
  };
}
