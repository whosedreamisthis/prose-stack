import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { SEED_SCENE_TEXT } from "@/lib/manuscript-config";
import { countDocWords, docFromText, emptyDoc, type DocNode } from "@/lib/manuscript-text";
import type { BookNode, ManuscriptNodeSummary, SceneDetail, WordStats } from "@/types/manuscript";

const summarySelect = { id: true, parentId: true, type: true, title: true, position: true, wordCount: true } as const;

/** The date a save belongs to. UTC, matching how `DailyWordCount.date` is stored. */
export function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Creates Chapter 1 / Scene 1 in a new project. Runs inside the caller's transaction. */
export async function seedManuscript(tx: Prisma.TransactionClient, projectId: string) {
  const chapter = await tx.manuscriptNode.create({
    data: { projectId, type: "CHAPTER", title: "Chapter 1", position: 0 },
    select: { id: true },
  });
  const content = docFromText(SEED_SCENE_TEXT);
  await tx.manuscriptNode.create({
    data: {
      projectId,
      parentId: chapter.id,
      type: "SCENE",
      title: "Scene 1",
      position: 0,
      content: content as Prisma.InputJsonValue,
      wordCount: countDocWords(content),
    },
  });
}

/** Seeds projects created before the manuscript existed. The project row is locked so two requests cannot both seed. */
async function ensureSeeded(projectId: string) {
  if ((await prisma.manuscriptNode.count({ where: { projectId } })) > 0) return;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "Project" WHERE "id" = ${projectId} FOR UPDATE`;
    if ((await tx.manuscriptNode.count({ where: { projectId } })) === 0) await seedManuscript(tx, projectId);
  });
}

/** Every node of the project, without scene content. Empty when the project is not the user's. Memoized per request. */
export const getManuscript = cache(async (userId: string, projectId: string): Promise<ManuscriptNodeSummary[]> => {
  const owned = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!owned) return [];
  await ensureSeeded(projectId);
  return prisma.manuscriptNode.findMany({
    where: { projectId },
    orderBy: [{ position: "asc" }],
    select: summarySelect,
  });
});

export async function getScene(userId: string, projectId: string, nodeId: string): Promise<SceneDetail | null> {
  const node = await prisma.manuscriptNode.findFirst({
    where: { id: nodeId, projectId, type: "SCENE", project: { userId } },
    select: { id: true, title: true, summary: true, content: true, wordCount: true, updatedAt: true },
  });
  if (!node) return null;
  return { ...node, content: (node.content as DocNode | null) ?? emptyDoc() };
}

export async function getWordStats(projectId: string): Promise<WordStats> {
  const [total, today] = await Promise.all([
    prisma.manuscriptNode.aggregate({ where: { projectId, type: "SCENE" }, _sum: { wordCount: true } }),
    prisma.dailyWordCount.findUnique({
      where: { projectId_date: { projectId, date: todayUtc() } },
      select: { startWords: true },
    }),
  ]);
  return { totalWords: total._sum.wordCount ?? 0, startWords: today?.startWords ?? null };
}

/** Every node with scene content, for the book view. */
export async function getBookNodes(userId: string, projectId: string): Promise<BookNode[]> {
  const nodes = await getManuscript(userId, projectId);
  if (nodes.length === 0) return [];
  const scenes = await prisma.manuscriptNode.findMany({
    where: { projectId, type: "SCENE" },
    select: { id: true, content: true },
  });
  const contentById = new Map(scenes.map((s) => [s.id, s.content as DocNode | null]));
  return nodes.map((n) => ({ ...n, content: contentById.get(n.id) ?? null }));
}
