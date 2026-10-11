import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLandingPath } from "@/lib/projects";

// Where signed-in users land: their last-opened project, else the project list.
// A route handler, so the redirect happens before any page renders (no landing-page flash).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  redirect(await getLandingPath(user.id));
}
