import { vi } from "vitest";

// Shared mock for `@/lib/db`. Add model delegates here as features introduce them.
export const prismaMock = {
  user: {
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("server-only", () => ({}));
