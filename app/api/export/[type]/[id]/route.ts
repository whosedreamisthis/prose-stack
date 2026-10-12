import { getCurrentUser } from "@/lib/auth";
import { EXPORT_FAILED, attachmentHeader, exportParamsSchema, pdfFileName } from "@/lib/export-config";
import { buildExport } from "@/lib/export";

/**
 * One character, place, scene, chapter or part as a PDF download. Behind sign-in like every non-public route (see
 * proxy.ts); an item that isn't the signed-in user's is a 404, the same as one that doesn't exist.
 */
export async function GET(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  const parsed = exportParamsSchema.safeParse({ type, id, projectId: new URL(request.url).searchParams.get("projectId") });
  if (!parsed.success) return Response.json({ error: "Invalid export request." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to export." }, { status: 401 });

  try {
    const result = await buildExport(user.id, parsed.data.type, parsed.data.id, parsed.data.projectId);
    if (!result) return Response.json({ error: "Not found." }, { status: 404 });
    return new Response(new Uint8Array(result.pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": attachmentHeader(pdfFileName(result.name)),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("pdf export failed:", error);
    return Response.json({ error: EXPORT_FAILED }, { status: 500 });
  }
}
