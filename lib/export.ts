import { prisma } from "@/lib/db";
import { CHARACTER_ROLES, SKETCH_FIELDS } from "@/lib/character-config";
import { getCharacter, listCharacterNotes, listCharacters } from "@/lib/characters";
import type { ExportType } from "@/lib/export-config";
import { buildBookItems } from "@/lib/book/content";
import { getBookNodes, getManuscript, getScene } from "@/lib/manuscript";
import type { DocNode } from "@/lib/manuscript-text";
import { PLACE_FIELDS } from "@/lib/place-config";
import { renderBookPdf } from "@/lib/pdf/book";
import { renderManuscriptPdf, type ManuscriptSection } from "@/lib/pdf/manuscript";
import { renderSketchPdf } from "@/lib/pdf/sketch";
import { getPlace, listPlaceNotes } from "@/lib/places";
import { getProject } from "@/lib/projects";
import { getResearchItem } from "@/lib/research";
import { toFormatting } from "@/lib/formatting";
import type { ManuscriptNodeSummary } from "@/types/manuscript";

export interface ExportedPdf {
  /** The item's name, for the file name. */
  name: string;
  pdf: Buffer;
}

const filled = <K extends string>(fields: { key: K; label: string }[], values: Record<K, string>) =>
  fields.filter((f) => values[f.key].trim() !== "").map((f) => ({ label: f.label, text: values[f.key].trim() }));

/**
 * The PDF of one character, place, scene, chapter or part, or null when it isn't the user's, is trashed or archived, or
 * doesn't exist. Everything is read through the same user-scoped reads the pages use, so ownership is checked once, there.
 */
export async function buildExport(userId: string, type: ExportType, id: string, projectId: string): Promise<ExportedPdf | null> {
  const project = await getProject(userId, projectId);
  if (!project) return null;
  if (type === "character") return exportCharacter(userId, project.title, id, projectId);
  if (type === "place") return exportPlace(userId, project.title, id, projectId);
  if (type === "book") return exportBook(userId, project);
  if (type === "research") return exportResearchNote(userId, project, id);
  return exportNode(userId, project, id);
}

/** The whole manuscript as the Book view's pages. The id of a book export is its project, which was just checked. */
async function exportBook(userId: string, project: NonNullable<Awaited<ReturnType<typeof getProject>>>) {
  const nodes = await getBookNodes(userId, project.id);
  const meta = { title: project.title, subtitle: project.subtitle ?? "", author: project.author };
  return { name: project.title, pdf: await renderBookPdf(meta, buildBookItems(nodes), toFormatting(project)) };
}

/** A research note: its title and text, in the project's formatting. Links have nothing to export. */
async function exportResearchNote(userId: string, project: NonNullable<Awaited<ReturnType<typeof getProject>>>, id: string) {
  const item = await getResearchItem(userId, project.id, id);
  if (!item || item.type !== "NOTE") return null;
  const sections: ManuscriptSection[] = [
    { kind: "title", text: item.title, level: 2 },
    { kind: "scene", doc: item.content },
  ];
  return { name: item.title, pdf: await renderManuscriptPdf(toFormatting(project), sections) };
}

async function exportCharacter(userId: string, projectTitle: string, id: string, projectId: string) {
  const [character, notes] = await Promise.all([getCharacter(userId, projectId, id), listCharacterNotes(userId, projectId, id)]);
  if (!character) return null;
  const role = CHARACTER_ROLES.find((r) => r.value === character.role);
  const pdf = await renderSketchPdf({
    projectTitle,
    name: character.name,
    subtitle: role ? `${role.label} character` : undefined,
    fields: filled(SKETCH_FIELDS, character),
    notes,
  });
  return { name: character.name, pdf };
}

async function exportPlace(userId: string, projectTitle: string, id: string, projectId: string) {
  const [place, notes, characters] = await Promise.all([
    getPlace(userId, projectId, id),
    listPlaceNotes(userId, projectId, id),
    listCharacters(userId, projectId),
  ]);
  if (!place) return null;
  // getPlace already drops trashed and archived characters; the live list gives the names.
  const related = characters.filter((c) => place.relatedCharacterIds.includes(c.id)).map((c) => c.name);
  const pdf = await renderSketchPdf({ projectTitle, name: place.name, fields: filled(PLACE_FIELDS, place), related, notes });
  return { name: place.name, pdf };
}

async function exportNode(userId: string, project: NonNullable<Awaited<ReturnType<typeof getProject>>>, id: string) {
  const formatting = toFormatting(project);
  // Only live nodes: the outline read leaves trashed ones out, so a trashed chapter or scene is "not found".
  const nodes = await getManuscript(userId, project.id);
  const node = nodes.find((n) => n.id === id);
  if (!node) return null;

  if (node.type === "SCENE") {
    const scene = await getScene(userId, project.id, id);
    if (!scene) return null;
    return { name: node.title, pdf: await renderManuscriptPdf(formatting, [{ kind: "scene", doc: scene.content }]) };
  }

  const childrenOf = new Map<string | null, ManuscriptNodeSummary[]>();
  for (const n of nodes) childrenOf.set(n.parentId, [...(childrenOf.get(n.parentId) ?? []), n]);
  for (const list of childrenOf.values()) list.sort((a, b) => a.position - b.position);

  // The chapters and scenes under the node, in reading order.
  const ordered: ManuscriptNodeSummary[] = [];
  const walk = (parentId: string) => {
    for (const child of childrenOf.get(parentId) ?? []) {
      ordered.push(child);
      walk(child.id);
    }
  };
  walk(id);

  const sceneIds = ordered.filter((n) => n.type === "SCENE").map((n) => n.id);
  const rows = sceneIds.length
    ? await prisma.manuscriptNode.findMany({
        where: { id: { in: sceneIds }, projectId: project.id, type: "SCENE", trashedAt: null, project: { userId } },
        select: { id: true, content: true },
      })
    : [];
  const content = new Map(rows.map((r) => [r.id, r.content as DocNode | null]));

  const sections: ManuscriptSection[] = [{ kind: "title", text: node.title, level: node.type === "PART" ? 1 : 2 }];
  for (const n of ordered) {
    if (n.type === "SCENE") sections.push({ kind: "scene", doc: content.get(n.id) ?? null });
    else sections.push({ kind: "title", text: n.title, level: 2 });
  }
  return { name: node.title, pdf: await renderManuscriptPdf(formatting, sections) };
}
