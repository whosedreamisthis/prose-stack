import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { NewProjectButton } from "@/components/projects/NewProjectButton";
import { getCurrentUser } from "@/lib/auth";
import { MAX_PROJECTS_PER_USER } from "@/lib/project-config";
import { listProjects } from "@/lib/projects";

async function ProjectList() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const projects = await listProjects(user.id);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} of {MAX_PROJECTS_PER_USER}
          </p>
        </div>
        <NewProjectButton atLimit={projects.length >= MAX_PROJECTS_PER_USER} />
      </div>
      {projects.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No projects yet. Create your first book to get started.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <Suspense fallback={<p className="text-muted-foreground">Loading projects…</p>}>
        <ProjectList />
      </Suspense>
    </main>
  );
}
