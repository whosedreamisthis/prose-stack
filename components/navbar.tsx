import { Suspense } from "react";
import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <Link href="/" className="text-lg font-semibold">
        ProseStack
      </Link>
      <Suspense>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </Suspense>
    </header>
  );
}
