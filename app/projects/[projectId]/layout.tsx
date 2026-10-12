import { Suspense } from "react";
import { ProjectShell } from "@/components/layout/ProjectShell";
import { ProjectSidebar } from "@/components/layout/ProjectSidebar";

// The shell is static, so it renders immediately and never shifts. The sidebar lives here, not in a slot, so it stays
// mounted between sections instead of reloading. The right and toolbar slots sit in their own Suspense boundaries
// because Next.js resolves parallel-route slots at request time under Cache Components.
export default function ProjectLayout({ children, right, toolbar, params }: LayoutProps<"/projects/[projectId]">) {
  return (
    <>
      <ProjectShell left={<ProjectSidebar params={params} />} right={<Suspense>{right}</Suspense>} toolbar={<Suspense>{toolbar}</Suspense>}>
        {children}
      </ProjectShell>
    </>
  );
}
