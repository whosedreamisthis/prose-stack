import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

async function RedirectIfSignedIn() {
  const { userId } = await auth();
  if (userId) redirect("/projects");
  return null;
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <h1 className="text-4xl font-semibold tracking-tight">ProseStack</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        A writing workspace for novels and long-form fiction.
      </p>
      <div className="flex gap-3">
        <Link href="/sign-in" className="rounded-md border px-4 py-2 font-medium">
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-black px-4 py-2 font-medium text-white dark:bg-white dark:text-black"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
