"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import {
  DUPLICATE_LABEL,
  MAX_LABELS,
  createLabelSchema,
  labelNameKey,
  labelRefSchema,
  recolorLabelSchema,
  renameLabelSchema,
  setNodeLabelSchema,
} from "@/lib/label-config";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "Label not found.";

function invalid(error: { issues: { message: string }[] }): { success: false; error: string } {
  return { success: false, error: error.issues[0]?.message ?? "Invalid request." };
}

/** After a write: expire the cached reads it changed and refresh the open page. The tags must match lib/labels.ts. */
function refresh(projectId: string, ...tags: string[]) {
  for (const tag of [cacheTags.labels(projectId), ...tags]) updateTag(tag);
  revalidatePath(`/projects/${projectId}`, "layout");
}

/** Prisma's error for a violated unique constraint: another label already has this name key. */
const isDuplicate = (error: unknown) => typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";

export async function createLabel(input: { projectId: string; name: string; color: string; id?: string }): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createLabelSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, name, color, id } = parsed.data;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      select: { id: true, _count: { select: { labels: true } } },
    });
    if (!project) return { success: false, error: "Project not found." };
    if (project._count.labels >= MAX_LABELS) return { success: false, error: `A project can have up to ${MAX_LABELS} labels.` };

    const created = await prisma.label.create({
      data: { ...(id && { id }), projectId, name, nameKey: labelNameKey(name), color },
      select: { id: true },
    });

    refresh(projectId);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    if (isDuplicate(error)) return { success: false, error: DUPLICATE_LABEL };
    console.error("createLabel failed:", error);
    return { success: false, error: "Could not add the label. Please try again." };
  }
}

export async function renameLabel(input: { projectId: string; labelId: string; name: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = renameLabelSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, labelId, name } = parsed.data;

    const { count } = await prisma.label.updateMany({
      where: { id: labelId, projectId, project: { userId: user.id } },
      data: { name, nameKey: labelNameKey(name) },
    });
    if (count === 0) return { success: false, error: NOT_FOUND };

    refresh(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    if (isDuplicate(error)) return { success: false, error: DUPLICATE_LABEL };
    console.error("renameLabel failed:", error);
    return { success: false, error: "Could not rename the label. Please try again." };
  }
}

export async function recolorLabel(input: { projectId: string; labelId: string; color: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = recolorLabelSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, labelId, color } = parsed.data;

    const { count } = await prisma.label.updateMany({
      where: { id: labelId, projectId, project: { userId: user.id } },
      data: { color },
    });
    if (count === 0) return { success: false, error: NOT_FOUND };

    refresh(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("recolorLabel failed:", error);
    return { success: false, error: "Could not change the color. Please try again." };
  }
}

/** Deletes a label. What carried it is unlabelled (the foreign keys are SetNull), not deleted. */
export async function deleteLabel(input: { projectId: string; labelId: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = labelRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, labelId } = parsed.data;

    const { count } = await prisma.label.deleteMany({ where: { id: labelId, projectId, project: { userId: user.id } } });
    if (count === 0) return { success: false, error: NOT_FOUND };

    // The outline and the plot show the label, so they change too.
    refresh(projectId, cacheTags.manuscript(projectId), cacheTags.plot(projectId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteLabel failed:", error);
    return { success: false, error: "Could not delete the label. Please try again." };
  }
}

/** Puts a label on a part, chapter or scene, or takes it off (`labelId: null`). The label must be the project's own. */
export async function setNodeLabel(input: { projectId: string; nodeId: string; labelId: string | null }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = setNodeLabelSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, nodeId, labelId } = parsed.data;

    if (labelId && !(await prisma.label.findFirst({ where: { id: labelId, projectId, project: { userId: user.id } }, select: { id: true } }))) {
      return { success: false, error: NOT_FOUND };
    }
    const { count } = await prisma.manuscriptNode.updateMany({
      where: { id: nodeId, projectId, trashedAt: null, project: { userId: user.id } },
      data: { labelId },
    });
    if (count === 0) return { success: false, error: "Item not found." };

    refresh(projectId, cacheTags.manuscript(projectId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("setNodeLabel failed:", error);
    return { success: false, error: "Could not change the label. Please try again." };
  }
}
