import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { countUsers } from "@/lib/users";

describe("countUsers", () => {
  beforeEach(() => {
    prismaMock.user.count.mockReset();
  });

  it("returns the count from the mocked client without touching a database", async () => {
    prismaMock.user.count.mockResolvedValue(3);
    await expect(countUsers()).resolves.toBe(3);
    expect(prismaMock.user.count).toHaveBeenCalledOnce();
  });
});
