import { DemoRegisterButton } from "@/components/demo/DemoRegisterButton";
import { getCurrentUser } from "@/lib/auth";
import { hoursLeft } from "@/lib/demo-config";

/** Shown to demo users only: how long their data lasts, and the way out to a real account. */
export async function DemoBanner() {
  const user = await getCurrentUser();
  if (!user?.isDemo || !user.demoExpiresAt) return null;

  const hours = hoursLeft(user.demoExpiresAt);
  return (
    <div
      role="status"
      className="border-b bg-primary/10 px-6 py-1.5 text-center text-sm"
    >
      Demo — your data will be deleted in {hours}{" "}
      {hours === 1 ? "hour" : "hours"}. <DemoRegisterButton />
    </div>
  );
}
