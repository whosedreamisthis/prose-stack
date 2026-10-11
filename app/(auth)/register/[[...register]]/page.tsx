import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center py-16">
      <Suspense>
        <SignUp />
      </Suspense>
    </main>
  );
}
