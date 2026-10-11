import { AccentStyle } from "@/components/layout/AccentStyle";
import { getCurrentUser } from "@/lib/auth";
import { accentCss, getAccentTokens } from "@/lib/accent";
import { getProject } from "@/lib/projects";

/**
 * Streams the project's accent color as a <style> tag, so a hard load has it before hydration.
 * Render it inside its own <Suspense> with a null fallback; it renders nothing when there is no valid color.
 */
export async function ProjectAccentStyle({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const project = await getProject(user.id, projectId);
  const tokens = project ? getAccentTokens(project.coverColor) : null;
  return tokens ? <AccentStyle css={accentCss(tokens)} /> : null;
}
