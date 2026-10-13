"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { cacheTags } from "@/lib/cache-tags";
import { getCurrentUser } from "@/lib/auth";
import { projectIdSchema } from "@/lib/project-config";
import { pruneBeatProgress } from "@/lib/story";
import { updateProjectSettingsSchema, type UpdateProjectSettingsInput } from "@/lib/settings-config";
import { themeSchema, type ThemeChoice } from "@/lib/theme-config";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "Project not found.";

/** Saves the project fields the settings modal changed, in one write scoped to the signed-in user's project. */
export async function updateProjectSettings(projectId: string, input: UpdateProjectSettingsInput): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };

    if (!projectIdSchema.safeParse(projectId).success) return { success: false, error: NOT_FOUND };

    const parsed = updateProjectSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };
    }
    const { title, subtitle, author, coverColor, storyTemplateId, fontFamily, fontSize, lineSpacing } = parsed.data;

    // Formatting is display only, so a formatting-only change keeps the project's "edited" date as it was.
    const keepEditedDate = title === undefined && subtitle === undefined && author === undefined && coverColor === undefined;
    const previous = keepEditedDate
      ? await prisma.project.findFirst({ where: { id: projectId, userId: user.id }, select: { updatedAt: true } })
      : null;
    if (keepEditedDate && !previous) return { success: false, error: NOT_FOUND };

    // Changing the template drops the progress of beats the new one lacks, in the same transaction as the change.
    const count = await prisma.$transaction(async (tx) => {
      const { count } = await tx.project.updateMany({
        where: { id: projectId, userId: user.id },
        data: {
          ...(title !== undefined && { title }),
          ...(subtitle !== undefined && { subtitle: subtitle || null }),
          ...(author !== undefined && { author }),
          ...(coverColor !== undefined && { coverColor }),
          ...(storyTemplateId !== undefined && { storyTemplateId }),
          ...(fontFamily !== undefined && { fontFamily }),
          ...(fontSize !== undefined && { fontSize }),
          ...(lineSpacing !== undefined && { lineSpacing }),
          ...(previous && { updatedAt: previous.updatedAt }),
        },
      });
      if (count > 0 && storyTemplateId !== undefined) await pruneBeatProgress(tx, projectId, storyTemplateId);
      return count;
    });
    if (count === 0) return { success: false, error: NOT_FOUND };
    if (storyTemplateId !== undefined) updateTag(cacheTags.structure(projectId));

    // Every cached read of the project carries this tag, so this drops its characters, outline and scenes too.
    updateTag(cacheTags.project(projectId));
    updateTag(cacheTags.projects(user.id));
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateProjectSettings failed:", error);
    return { success: false, error: "Could not save the settings. Please try again." };
  }
}

/** Saves the signed-in user's theme. `null` clears the choice, so the system preference applies again. */
export async function updateUserTheme(theme: ThemeChoice | null): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };

    const parsed = themeSchema.safeParse(theme);
    if (!parsed.success) return { success: false, error: "Pick light or dark." };

    await prisma.user.update({ where: { id: user.id }, data: { theme: parsed.data } });

    updateTag(cacheTags.user(user.id));
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateUserTheme failed:", error);
    return { success: false, error: "Could not save the theme. Please try again." };
  }
}
