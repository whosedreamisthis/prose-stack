"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { IGNORE_LIMIT, addIgnoreSchema, removeIgnoreSchema } from "@/lib/proofread/config";
import { ownedProject } from "@/lib/proofread/data";
import type { ActionResult } from "@/types/actions";
import type { ProofreadIgnoreItem } from "@/types/proofread";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "Project not found.";

function invalid(error: { issues: { message: string }[] }): { success: false; error: string } {
  return { success: false, error: error.issues[0]?.message ?? "Invalid request." };
}

/** The project's ignore list, newest first. */
export async function listProofreadIgnores(projectId: string): Promise<ActionResult<ProofreadIgnoreItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    if (!(await ownedProject(user.id, projectId))) return { success: false, error: NOT_FOUND };
    const items = await prisma.proofreadIgnore.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, value: true },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("listProofreadIgnores failed:", error);
    return { success: false, error: "Could not load the ignore list." };
  }
}

/** "Ignore always": adds a word or rule to the project's list. Adding something already there is not an error. */
export async function addProofreadIgnore(input: {
  projectId: string;
  kind: "WORD" | "RULE";
  value: string;
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = addIgnoreSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, kind } = parsed.data;
    const value = parsed.data.value.toLowerCase();
    if (!(await ownedProject(user.id, projectId))) return { success: false, error: NOT_FOUND };

    const where = { projectId_kind_value: { projectId, kind, value } };
    if (!(await prisma.proofreadIgnore.findUnique({ where, select: { id: true } }))) {
      if ((await prisma.proofreadIgnore.count({ where: { projectId } })) >= IGNORE_LIMIT) {
        return { success: false, error: `The ignore list can hold up to ${IGNORE_LIMIT} entries.` };
      }
      await prisma.proofreadIgnore.create({ data: { projectId, kind, value } });
    }
    return { success: true, data: undefined };
  } catch (error) {
    console.error("addProofreadIgnore failed:", error);
    return { success: false, error: "Could not add it to the ignore list." };
  }
}

export async function removeProofreadIgnore(input: { projectId: string; id: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = removeIgnoreSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, id } = parsed.data;
    if (!(await ownedProject(user.id, projectId))) return { success: false, error: NOT_FOUND };
    await prisma.proofreadIgnore.deleteMany({ where: { id, projectId } });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("removeProofreadIgnore failed:", error);
    return { success: false, error: "Could not remove it from the ignore list." };
  }
}
