import { describe, expect, it } from "vitest";
import { attachmentHeader, exportParamsSchema, exportUrl, pdfFileName } from "@/lib/export-config";

describe("pdfFileName", () => {
  it("adds .pdf and removes characters invalid in file names", () => {
    expect(pdfFileName("Mara Quill")).toBe("Mara Quill.pdf");
    expect(pdfFileName('a/b\c:d*e?f"g<h>i|j')).toBe("abcdefghij.pdf");
  });

  it("collapses whitespace, trims trailing dots and limits the length", () => {
    expect(pdfFileName("  Chapter   1... ")).toBe("Chapter 1.pdf");
    expect(pdfFileName("x".repeat(300)).length).toBe(104);
  });

  it("falls back when nothing is left", () => {
    expect(pdfFileName("???")).toBe("Export.pdf");
    expect(pdfFileName("")).toBe("Export.pdf");
  });
});

describe("attachmentHeader", () => {
  it("keeps the real name in filename* and an ASCII fallback", () => {
    expect(attachmentHeader("Café.pdf")).toBe(`attachment; filename="Caf_.pdf"; filename*=UTF-8''Caf%C3%A9.pdf`);
  });
});

describe("exportParamsSchema", () => {
  it("accepts the three types", () => {
    for (const type of ["character", "place", "node"]) {
      expect(exportParamsSchema.safeParse({ type, id: "abc", projectId: "p1" }).success).toBe(true);
    }
  });

  it("rejects unknown types and missing or oversized ids", () => {
    expect(exportParamsSchema.safeParse({ type: "note", id: "abc", projectId: "p1" }).success).toBe(false);
    expect(exportParamsSchema.safeParse({ type: "place", id: "abc", projectId: null }).success).toBe(false);
    expect(exportParamsSchema.safeParse({ type: "place", id: "a".repeat(65), projectId: "p1" }).success).toBe(false);
  });
});

describe("exportUrl", () => {
  it("encodes the ids", () => {
    expect(exportUrl("node", "a b", "p&1")).toBe("/api/export/node/a%20b?projectId=p%261");
  });
});
