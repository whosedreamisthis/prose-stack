import { getCurrentUser } from "@/lib/auth";
import { checkBlocks } from "@/lib/proofread/check";
import {
  DEMO_RATE_LIMIT_PER_MINUTE,
  MAX_REQUEST_CHARS,
  RATE_LIMIT_PER_MINUTE,
  proofreadRequestSchema,
} from "@/lib/proofread/config";
import { ownedProject, proofreadContext } from "@/lib/proofread/data";
import { allowRequest } from "@/lib/proofread/rate-limit";

/**
 * Checks paragraphs of one scene for usage, style and consistency slips. The text is checked on this server by open-source
 * libraries and is not sent anywhere else or stored. Only the signed-in owner of the project can use it.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "You need to be signed in." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the text as JSON." }, { status: 400 });
  }
  const parsed = proofreadRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const { projectId, blocks, categories, quotes } = parsed.data;
  if (blocks.reduce((sum, block) => sum + block.length, 0) > MAX_REQUEST_CHARS) {
    return Response.json({ error: "That is too much text for one request." }, { status: 413 });
  }

  if (!allowRequest(`proofread:${user.id}`, user.isDemo ? DEMO_RATE_LIMIT_PER_MINUTE : RATE_LIMIT_PER_MINUTE)) {
    return Response.json({ error: "You are proofreading too fast. Wait a moment and try again." }, { status: 429 });
  }

  try {
    if (!(await ownedProject(user.id, projectId))) return Response.json({ error: "Project not found." }, { status: 404 });
    const { names, ignore } = await proofreadContext(projectId);
    const suggestions = await checkBlocks(blocks, { categories, names, ignore, quotes });
    return Response.json({ suggestions });
  } catch (error) {
    console.error("proofread failed:", error);
    return Response.json({ error: "Proofreading failed. Please try again." }, { status: 500 });
  }
}
