import { describe, it, expect } from "vitest";
import { chooseInitialContent } from "@/lib/manuscript-sync";
import { docFromText } from "@/lib/manuscript-text";

const server = { content: docFromText("server"), updatedAt: 1000 };
const local = (baseUpdatedAt: number, dirty: boolean) => ({ content: docFromText("local"), baseUpdatedAt, dirty });

describe("chooseInitialContent", () => {
  it("uses the server copy when there is no local copy", () => {
    expect(chooseInitialContent(server, null)).toBe(server.content);
  });

  it("keeps unsaved local edits made on top of the server copy", () => {
    expect(chooseInitialContent(server, local(1000, true))).toEqual(docFromText("local"));
  });

  it("prefers the local copy when the server copy is stale", () => {
    expect(chooseInitialContent(server, local(2000, false))).toEqual(docFromText("local"));
  });

  it("drops the local copy when the server has moved on", () => {
    expect(chooseInitialContent(server, local(500, true))).toBe(server.content);
  });

  it("uses the server copy when the local copy is clean and in sync", () => {
    expect(chooseInitialContent(server, local(1000, false))).toBe(server.content);
  });
});
