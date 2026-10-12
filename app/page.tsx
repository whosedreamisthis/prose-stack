import Link from "next/link";
import { TryDemoButton } from "@/components/demo/TryDemoButton";
import { Logo } from "@/components/layout/Logo";

// Signed-in visitors never see this page: proxy.ts redirects them to /continue.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="sr-only">ProseStack</h1>
      <Logo className="text-6xl [&_svg]:size-16" />
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        A writing workspace for novels and long-form fiction.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/sign-in" className="rounded-md border px-4 py-2 font-medium">
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-black px-4 py-2 font-medium text-white dark:bg-white dark:text-black"
        >
          Register
        </Link>
        <TryDemoButton className="h-auto px-4 py-2 text-base" />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">
        Try demo opens a sample novel, no sign-up needed. Demo data is deleted after 12 hours.
      </p>
    </main>
  );
}
