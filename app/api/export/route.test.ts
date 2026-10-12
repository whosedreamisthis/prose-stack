import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));
const buildExportMock = vi.fn();
vi.mock("@/lib/export", () => ({ buildExport: (...args: unknown[]) => buildExportMock(...args) }));

import { GET } from "@/app/api/export/[type]/[id]/route";

const call = (type: string, id: string, query = "?projectId=p1") =>
  GET(new Request(`http://localhost/api/export/${type}/${id}${query}`), { params: Promise.resolve({ type, id }) });

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/export/[type]/[id]", () => {
  it("returns the PDF as an attachment named after the item", async () => {
    buildExportMock.mockResolvedValue({ name: "Mara: Quill", pdf: Buffer.from("%PDF-1.3") });
    const response = await call("character", "c1");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain('filename="Mara Quill.pdf"');
    expect(buildExportMock).toHaveBeenCalledWith("user-1", "character", "c1", "p1");
  });

  it("is a 404 when the item is not the user's or does not exist", async () => {
    buildExportMock.mockResolvedValue(null);
    expect((await call("place", "other")).status).toBe(404);
  });

  it("rejects an unknown type or a missing project with 400", async () => {
    expect((await call("note", "x")).status).toBe(400);
    expect((await call("place", "x", "")).status).toBe(400);
    expect(buildExportMock).not.toHaveBeenCalled();
  });

  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await call("node", "n1")).status).toBe(401);
    expect(buildExportMock).not.toHaveBeenCalled();
  });

  it("is a 500 when generation fails", async () => {
    buildExportMock.mockRejectedValue(new Error("boom"));
    expect((await call("node", "n1")).status).toBe(500);
  });
});
