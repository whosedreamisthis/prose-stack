import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import type { PlaceDetail, PlaceNoteItem, PlaceSummary } from "@/types/places";

const visible = { trashedAt: null, archivedAt: null } as const;

// These reads are cached until a Server Action in actions/places.ts (or actions/characters.ts, for the related characters)
// changes what they return (see lib/cache-tags.ts). The user id is an argument, so it is part of each cache key.

/** The project's places that are not trashed or archived. Empty when the project is not the user's. */
export async function listPlaces(userId: string, projectId: string): Promise<PlaceSummary[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.places(projectId), cacheTags.project(projectId));
  return prisma.place.findMany({
    where: { projectId, project: { userId }, ...visible },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
}

export async function getPlace(userId: string, projectId: string, placeId: string): Promise<PlaceDetail | null> {
  "use cache";
  cacheLife("days");
  // Also tagged with the characters: trashing or archiving a character drops it from this place's related characters.
  cacheTag(cacheTags.place(placeId), cacheTags.characters(projectId), cacheTags.project(projectId));
  const row = await prisma.place.findFirst({
    where: { id: placeId, projectId, project: { userId }, ...visible },
    select: {
      id: true,
      name: true,
      location: true,
      roleInStory: true,
      season: true,
      uniqueFeatures: true,
      description: true,
      sights: true,
      sounds: true,
      smell: true,
      relatedCharacters: { where: visible, select: { id: true } },
    },
  });
  if (!row) return null;
  const text = (v: string | null) => v ?? "";
  return {
    id: row.id,
    name: row.name,
    location: text(row.location),
    roleInStory: text(row.roleInStory),
    season: text(row.season),
    uniqueFeatures: text(row.uniqueFeatures),
    description: text(row.description),
    sights: text(row.sights),
    sounds: text(row.sounds),
    smell: text(row.smell),
    relatedCharacterIds: row.relatedCharacters.map((c) => c.id),
  };
}

/** Notes of one place, oldest first. */
export async function listPlaceNotes(userId: string, projectId: string, placeId: string): Promise<PlaceNoteItem[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.placeNotes(placeId), cacheTags.project(projectId));
  return prisma.placeNote.findMany({
    where: { placeId, place: { projectId, project: { userId }, ...visible } },
    orderBy: { createdAt: "asc" },
    select: { id: true, content: true },
  });
}
