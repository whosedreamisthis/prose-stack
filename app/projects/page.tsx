import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";

async function CurrentUserLabel() {
  const user = await getCurrentUser();
  return <>{user?.email ?? user?.name ?? "unknown"}</>;
}

// Placeholder until the Projects feature; also exercises the first-request user fallback.
export default function ProjectsPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Signed in as{" "}
        <Suspense fallback="…">
          <CurrentUserLabel />
        </Suspense>
        .
      </p>
    </main>
  );
}
