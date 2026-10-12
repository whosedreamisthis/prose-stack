import { ProjectNavActions } from "@/components/layout/ProjectNavActions";
import { getCurrentUser } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import { getUserTheme } from "@/lib/user-theme";

/** Hands the settings modal the saved project values and theme. Render it in <Suspense> with <ProjectNavActions /> as the fallback. */
export async function ProjectNavActionsLoader() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [projects, theme] = await Promise.all([listProjects(user.id), getUserTheme(user.id)]);
  return <ProjectNavActions projects={projects} theme={theme} />;
}
