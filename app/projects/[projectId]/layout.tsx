import { Suspense } from "react";
import { ProjectAccentStyle } from "@/components/layout/ProjectAccentStyle";
import { ProjectShell } from "@/components/layout/ProjectShell";

// The shell is static, so it renders immediately and never shifts. Each slot sits in its own Suspense boundary
// because Next.js resolves parallel-route slots at request time under Cache Components; the accent style does too.
export default function ProjectLayout({ children, left, right, toolbar, params }: LayoutProps<"/projects/[projectId]">) {
  return (
    <>
      <Suspense fallback={null}>
        <ProjectAccentStyle params={params} />
      </Suspense>
      <ProjectShell
        left={<Suspense>{left}</Suspense>}
        right={<Suspense>{right}</Suspense>}
        toolbar={<Suspense>{toolbar}</Suspense>}
      >
        {children}
      </ProjectShell>
    </>
  );
}
