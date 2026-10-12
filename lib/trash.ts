import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { noteLabel } from "@/lib/trash-config";
import { trashGroupIds, trashRoots } from "@/lib/trash-tree";
import { SKETCH_FIELDS } from "@/lib/character-config";
import type { DocNode } from "@/lib/manuscript-text";
import { PLACE_FIELDS } from "@/lib/place-config";
import { nodeSections } from "@/lib/trash-view";
import { listHiddenResearch, type HiddenField } from "@/lib/research-hidden";
import type { ArchiveItem, HiddenView, TrashItem, TrashKind, ViewSection } from "@/types/trash";

const NODE_LABEL = { PART: "Part", CHAPTER: "Chapter", SCENE: "Scene" } as const;
const live = { trashedAt: null, archivedAt: null } as const;

// Both reads are cached until a trash, archive, restore or delete action expires the `trash` / `archive` tag (see lib/cache-tags.ts).
// The user id is an argument, so it is part of each cache key.

/** Everything in the project's Trash, newest first. Empty when the project is not the user's. */
export async function listTrash(userId: string, projectId: string): Promise<TrashItem[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.trash(projectId), cacheTags.project(projectId));
  const owner = { projectId, project: { userId } };
  const [nodes, characters, places, characterNotes, placeNotes, sceneNotes, plotLines, plotPoints, projectNotes, research] = await Promise.all([
    prisma.manuscriptNode.findMany({
      where: { ...owner, trashedAt: { not: null } },
      select: { id: true, parentId: true, type: true, title: true, trashedAt: true },
    }),
    prisma.character.findMany({ where: { ...owner, trashedAt: { not: null } }, select: { id: true, name: true, trashedAt: true } }),
    prisma.place.findMany({ where: { ...owner, trashedAt: { not: null } }, select: { id: true, name: true, trashedAt: true } }),
    // A note of a trashed or archived owner comes back with its owner, so only notes of live owners are listed on their own.
    prisma.characterNote.findMany({
      where: { trashedAt: { not: null }, character: { ...owner, ...live } },
      select: { id: true, title: true, content: true, trashedAt: true, character: { select: { name: true } } },
    }),
    prisma.placeNote.findMany({
      where: { trashedAt: { not: null }, place: { ...owner, ...live } },
      select: { id: true, title: true, content: true, trashedAt: true, place: { select: { name: true } } },
    }),
    prisma.sceneNote.findMany({
      where: { trashedAt: { not: null }, scene: { ...owner, trashedAt: null } },
      select: { id: true, title: true, content: true, trashedAt: true, scene: { select: { title: true } } },
    }),
    prisma.plotLine.findMany({ where: { ...owner, trashedAt: { not: null } }, select: { id: true, name: true, trashedAt: true } }),
    // A point of a trashed line or scene comes back with its line or scene, so only points of live ones are listed on their own.
    prisma.plotPoint.findMany({
      where: { trashedAt: { not: null }, plotLine: { ...owner, trashedAt: null }, scene: { trashedAt: null } },
      select: { id: true, title: true, text: true, trashedAt: true, plotLine: { select: { name: true } }, scene: { select: { title: true } } },
    }),
    prisma.projectNote.findMany({
      where: { trashedAt: { not: null }, ...owner },
      select: { id: true, title: true, content: true, trashedAt: true, project: { select: { title: true } } },
    }),
    listHiddenResearch(userId, projectId, "trashedAt"),
  ]);

  const items: TrashItem[] = [
    ...trashRoots(nodes).map((n) => {
      const inside = trashGroupIds(nodes, n.id).length - 1;
      return {
        kind: "node" as const,
        id: n.id,
        title: n.title,
        detail: `${NODE_LABEL[n.type]}${inside > 0 ? `, with ${inside} ${inside === 1 ? "item" : "items"} inside` : ""}`,
        trashedAt: n.trashedAt!.getTime(),
      };
    }),
    ...characters.map((c) => ({
      kind: "character" as const,
      id: c.id,
      title: c.name,
      detail: "Character",
      trashedAt: c.trashedAt!.getTime(),
    })),
    ...places.map((p) => ({ kind: "place" as const, id: p.id, title: p.name, detail: "Place", trashedAt: p.trashedAt!.getTime() })),
    ...characterNotes.map((n) => ({
      kind: "characterNote" as const,
      id: n.id,
      title: noteLabel(n),
      detail: `Note on ${n.character.name}`,
      trashedAt: n.trashedAt!.getTime(),
    })),
    ...placeNotes.map((n) => ({
      kind: "placeNote" as const,
      id: n.id,
      title: noteLabel(n),
      detail: `Note on ${n.place.name}`,
      trashedAt: n.trashedAt!.getTime(),
    })),
    ...sceneNotes.map((n) => ({
      kind: "sceneNote" as const,
      id: n.id,
      title: noteLabel(n),
      detail: `Note on ${n.scene.title}`,
      trashedAt: n.trashedAt!.getTime(),
    })),
    ...projectNotes.map((n) => ({
      kind: "projectNote" as const,
      id: n.id,
      title: noteLabel(n),
      detail: `Note on ${n.project.title}`,
      trashedAt: n.trashedAt!.getTime(),
    })),
    ...plotLines.map((l) => ({ kind: "plotLine" as const, id: l.id, title: l.name, detail: "Plot line", trashedAt: l.trashedAt!.getTime() })),
    ...plotPoints.map((p) => ({
      kind: "plotPoint" as const,
      id: p.id,
      title: noteLabel({ title: p.title, content: p.text }),
      detail: `Plot point on ${p.scene.title}, ${p.plotLine.name}`,
      trashedAt: p.trashedAt!.getTime(),
    })),
    ...researchRows(research).map(({ at, ...row }) => ({ ...row, trashedAt: at })),
  ];
  return items.sort((a, b) => b.trashedAt - a.trashedAt);
}

/** Everything in the project's Archive, newest first. Empty when the project is not the user's. */
export async function listArchive(userId: string, projectId: string): Promise<ArchiveItem[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.archive(projectId), cacheTags.project(projectId));
  const where = { projectId, project: { userId }, trashedAt: null, archivedAt: { not: null } };
  const [characters, places, research] = await Promise.all([
    prisma.character.findMany({ where, select: { id: true, name: true, archivedAt: true } }),
    prisma.place.findMany({ where, select: { id: true, name: true, archivedAt: true } }),
    listHiddenResearch(userId, projectId, "archivedAt"),
  ]);
  const items: ArchiveItem[] = [
    ...characters.map((c) => ({
      kind: "character" as const,
      id: c.id,
      title: c.name,
      detail: "Character",
      archivedAt: c.archivedAt!.getTime(),
    })),
    ...places.map((p) => ({ kind: "place" as const, id: p.id, title: p.name, detail: "Place", archivedAt: p.archivedAt!.getTime() })),
    ...researchRows(research).map(({ at, ...row }) => ({ ...row, archivedAt: at })),
  ];
  return items.sort((a, b) => b.archivedAt - a.archivedAt);
}

const plural = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

/** Hidden research folders and items as Trash or Archive rows, with the moment they were hidden as `at`. */
function researchRows(research: Awaited<ReturnType<typeof listHiddenResearch>>) {
  return [
    ...research.folders.map((f) => ({
      kind: "researchFolder" as const,
      id: f.id,
      title: f.name,
      detail: `Research folder${f.inside > 0 ? `, with ${plural(f.inside)} inside` : ""}`,
      at: f.at,
    })),
    ...research.items.map((i) => ({
      kind: "researchItem" as const,
      id: i.id,
      title: i.title,
      detail: i.type === "LINK" ? "Research link" : "Research note",
      at: i.at,
    })),
  ];
}

/** A hidden research folder or item, read-only: a folder lists what is in it, a note shows its text, a link its address. */
async function researchView(
  owner: { projectId: string; project: { userId: string } },
  from: "trash" | "archive",
  kind: "researchFolder" | "researchItem",
  id: string,
): Promise<HiddenView | null> {
  const field: HiddenField = from === "trash" ? "trashedAt" : "archivedAt";
  const hidden = from === "trash" ? { trashedAt: { not: null } } : { trashedAt: null, archivedAt: { not: null } };
  if (kind === "researchItem") {
    const item = await prisma.researchItem.findFirst({
      where: { id, ...owner, ...hidden },
      select: { type: true, title: true, content: true, url: true, description: true },
    });
    if (!item) return null;
    const sections: ViewSection[] =
      item.type === "NOTE"
        ? [{ doc: (item.content as DocNode | null) ?? undefined }]
        : [{ heading: "Link", text: item.url ?? "" }, ...(item.description ? [{ heading: "Description", text: item.description }] : [])];
    return { kind, id, title: item.title, subtitle: item.type === "LINK" ? "Research link" : "Research note", sections };
  }
  const folder = await prisma.researchFolder.findFirst({ where: { id, ...owner, ...hidden }, select: { name: true, trashedAt: true, archivedAt: true } });
  if (!folder) return null;
  const at = field === "trashedAt" ? folder.trashedAt : folder.archivedAt;
  const [subfolders, items] = await Promise.all([
    prisma.researchFolder.findMany({ where: { parentId: id, [field]: at }, orderBy: { position: "asc" }, select: { name: true } }),
    prisma.researchItem.findMany({ where: { folderId: id, [field]: at }, orderBy: { position: "asc" }, select: { title: true } }),
  ]);
  const sections: ViewSection[] = [
    ...(subfolders.length ? [{ heading: "Folders", text: subfolders.map((f) => f.name).join("\n") }] : []),
    ...(items.length ? [{ heading: "Items", text: items.map((i) => i.title).join("\n") }] : []),
  ];
  return { kind, id, title: folder.name, subtitle: "Research folder", sections: sections.length ? sections : [{ text: "This folder is empty." }] };
}

const noteSections = (notes: { title: string | null; content: string }[]): ViewSection[] =>
  notes.map((n) => ({ heading: n.title?.trim() || "Note", text: n.content }));

/**
 * A trashed or archived item as a read-only view. `from` is the page it was opened from: Trash shows only trashed items,
 * Archive only archived ones (a live item is never shown here). Null when it is not there, not the user's or in the other place.
 */
export async function getHiddenView(
  userId: string,
  projectId: string,
  from: "trash" | "archive",
  kind: TrashKind,
  id: string,
): Promise<HiddenView | null> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.trash(projectId), cacheTags.archive(projectId), cacheTags.project(projectId));
  const owner = { projectId, project: { userId } };
  const hidden = from === "trash" ? { trashedAt: { not: null } } : { trashedAt: null, archivedAt: { not: null } };
  const text = (v: string | null) => v?.trim() ?? "";

  if (kind === "researchFolder" || kind === "researchItem") return researchView(owner, from, kind, id);

  if (kind === "character") {
    const c = await prisma.character.findFirst({
      where: { id, ...owner, ...hidden },
      include: { notes: { where: { trashedAt: null }, orderBy: { createdAt: "asc" } } },
    });
    if (!c) return null;
    const fields: ViewSection[] = SKETCH_FIELDS.filter((f) => text(c[f.key])).map((f) => ({ heading: f.label, text: text(c[f.key]) }));
    return {
      kind,
      id,
      title: c.name,
      subtitle: `Character · ${c.role === "MAIN" ? "Main" : "Supporting"}`,
      sections: [...fields, ...noteSections(c.notes)],
    };
  }

  if (kind === "place") {
    const p = await prisma.place.findFirst({
      where: { id, ...owner, ...hidden },
      include: {
        notes: { where: { trashedAt: null }, orderBy: { createdAt: "asc" } },
        relatedCharacters: { where: { trashedAt: null, archivedAt: null }, select: { name: true } },
      },
    });
    if (!p) return null;
    const fields: ViewSection[] = PLACE_FIELDS.filter((f) => text(p[f.key])).map((f) => ({ heading: f.label, text: text(p[f.key]) }));
    const related: ViewSection[] = p.relatedCharacters.length
      ? [{ heading: "Related characters", text: p.relatedCharacters.map((c) => c.name).join(", ") }]
      : [];
    return { kind, id, title: p.name, subtitle: "Place", sections: [...fields, ...related, ...noteSections(p.notes)] };
  }

  if (kind === "characterNote" || kind === "placeNote" || kind === "sceneNote") {
    // A note is only reachable from the Trash, and only while its owner is live (the same rule as the list).
    if (from !== "trash") return null;
    const ownerLive = { ...owner, ...live };
    const note =
      kind === "characterNote"
        ? await prisma.characterNote.findFirst({
            where: { id, trashedAt: { not: null }, character: ownerLive },
            select: { title: true, content: true, character: { select: { name: true } } },
          })
        : kind === "placeNote"
          ? await prisma.placeNote.findFirst({
              where: { id, trashedAt: { not: null }, place: ownerLive },
              select: { title: true, content: true, place: { select: { name: true } } },
            })
          : await prisma.sceneNote.findFirst({
              where: { id, trashedAt: { not: null }, scene: { ...owner, trashedAt: null } },
              select: { title: true, content: true, scene: { select: { title: true } } },
            });
    if (!note) return null;
    const ownerName = "character" in note ? note.character.name : "place" in note ? note.place.name : note.scene.title;
    return {
      kind,
      id,
      title: note.title?.trim() || "Note",
      subtitle: `Note on ${ownerName}`,
      sections: [{ text: note.content }],
    };
  }

  if (kind === "projectNote") {
    if (from !== "trash") return null;
    const note = await prisma.projectNote.findFirst({
      where: { id, trashedAt: { not: null }, ...owner },
      select: { title: true, content: true, project: { select: { title: true } } },
    });
    if (!note) return null;
    return { kind, id, title: note.title?.trim() || "Note", subtitle: `Note on ${note.project.title}`, sections: [{ text: note.content }] };
  }

  if (kind === "plotLine" || kind === "plotPoint") {
    if (from !== "trash") return null;
    if (kind === "plotLine") {
      const line = await prisma.plotLine.findFirst({
        where: { id, ...owner, trashedAt: { not: null } },
        select: { name: true, points: { where: { trashedAt: null, scene: { trashedAt: null } }, select: { title: true, text: true, scene: { select: { title: true } } } } },
      });
      if (!line) return null;
      const points: ViewSection[] = line.points.map((p) => ({ heading: p.scene.title, text: [p.title?.trim(), p.text].filter(Boolean).join("\n") }));
      return { kind, id, title: line.name, subtitle: "Plot line", sections: points };
    }
    const point = await prisma.plotPoint.findFirst({
      where: { id, trashedAt: { not: null }, plotLine: { ...owner, trashedAt: null }, scene: { trashedAt: null } },
      select: { title: true, text: true, plotLine: { select: { name: true } }, scene: { select: { title: true } } },
    });
    if (!point) return null;
    return {
      kind,
      id,
      title: point.title?.trim() || "Plot point",
      subtitle: `Plot point on ${point.scene.title}, ${point.plotLine.name}`,
      sections: [{ text: point.text }],
    };
  }

  // A manuscript item: only from the Trash (nodes cannot be archived).
  if (from !== "trash") return null;
  const nodes = await prisma.manuscriptNode.findMany({
    where: { ...owner, trashedAt: { not: null } },
    select: { id: true, parentId: true, type: true, title: true, position: true, trashedAt: true },
  });
  const root = nodes.find((n) => n.id === id);
  if (!root) return null;
  const group = trashGroupIds(nodes, id);
  const scenes = await prisma.manuscriptNode.findMany({
    where: { id: { in: group }, type: "SCENE", projectId },
    select: { id: true, content: true },
  });
  const docs = new Map(scenes.map((s) => [s.id, s.content as DocNode | null]));
  return {
    kind,
    id,
    title: root.title,
    subtitle: NODE_LABEL[root.type],
    sections: nodeSections(nodes, id, new Set(group), docs),
  };
}
