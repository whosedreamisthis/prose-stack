import { Suspense } from "react";
import { ProjectShell } from "@/components/layout/ProjectShell";

// The shell is static, so it renders immediately and never shifts. Each slot sits in its own Suspense boundary
// because Next.js resolves parallel-route slots at request time under Cache Components.
export default function ProjectLayout({ children, left, right }: LayoutProps<"/projects/[projectId]">) {
  return (
    <ProjectShell left={<Suspense>{left}</Suspense>} right={<Suspense>{right}</Suspense>}>
      {children}
    </ProjectShell>
  );
}
