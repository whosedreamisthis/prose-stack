import { ThemeSync } from "@/components/theme/ThemeSync";
import { getCurrentUser } from "@/lib/auth";
import { getUserTheme } from "@/lib/user-theme";

/** Streams the signed-in user's saved theme to the browser. Render it inside <Suspense>; signed-out pages get nothing. */
export async function ThemeSyncLoader() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <ThemeSync theme={await getUserTheme(user.id)} />;
}
