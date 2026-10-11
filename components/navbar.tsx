import { Suspense } from "react";
import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/layout/Logo";
import { ProjectNavActions } from "@/components/layout/ProjectNavActions";
import { ProjectSwitcher } from "@/components/projects/ProjectSwitcher";
import { getCurrentUser } from "@/lib/auth";
import { listProjects } from "@/lib/projects";

async function ProjectSwitcherLoader() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <ProjectSwitcher projects={await listProjects(user.id)} />;
}

export function Navbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center gap-4">
        <Link href="/" aria-label="ProseStack">
          <Logo />
        </Link>
        <Suspense fallback={<div className="h-7 w-28 animate-pulse rounded-lg bg-muted" />}>
          <ProjectSwitcherLoader />
        </Suspense>
      </div>
      <div className="flex items-center gap-2">
        <Suspense>
          <ProjectNavActions />
        </Suspense>
        <Suspense>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </Suspense>
      </div>
    </header>
  );
}
