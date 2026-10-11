import { beforeEach, describe, expect, it, vi } from "vitest";
import { localCopyKey, readLocalCopy, writeLocalCopy } from "@/lib/local-copy";
import { docFromText } from "@/lib/manuscript-text";

function stubStorage(store: Record<string, string> = {}) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    },
  });
  return store;
}

describe("local copy", () => {
  beforeEach(() => stubStorage());

  it("round-trips a copy per scene", () => {
    const copy = { content: docFromText("hello"), baseUpdatedAt: 5, dirty: true };
    writeLocalCopy("s1", copy);
    expect(readLocalCopy("s1")).toEqual(copy);
    expect(readLocalCopy("s2")).toBeNull();
  });

  it("ignores corrupt or malformed entries", () => {
    const store = stubStorage();
    store[localCopyKey("s1")] = "{not json";
    expect(readLocalCopy("s1")).toBeNull();
    store[localCopyKey("s1")] = JSON.stringify({ content: docFromText("x") });
    expect(readLocalCopy("s1")).toBeNull();
  });

  it("does not throw when storage is blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("full");
        },
      },
    });
    expect(() => writeLocalCopy("s1", { content: docFromText("x"), baseUpdatedAt: 1, dirty: false })).not.toThrow();
    expect(readLocalCopy("s1")).toBeNull();
  });
});
