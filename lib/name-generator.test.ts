import { describe, expect, it } from "vitest";
import { generateName } from "./name-generator";

describe("generateName", () => {
  it("returns a non-empty full name", async () => {
    const name = await generateName("any", 1);
    expect(name.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
  });

  it("is deterministic for the same seed", async () => {
    expect(await generateName("any", 42)).toBe(await generateName("any", 42));
  });

  it("varies across calls without a seed", async () => {
    const names = new Set<string>();
    for (let i = 0; i < 5; i++) names.add(await generateName());
    expect(names.size).toBeGreaterThan(1);
  });

  it("uses a different name pool per gender", async () => {
    const { faker } = await import("@faker-js/faker");
    faker.seed(7);
    const female = new Set(Array.from({ length: 30 }, () => faker.person.firstName("female")));
    const male = new Set(Array.from({ length: 30 }, () => faker.person.firstName("male")));
    for (let i = 0; i < 30; i++) {
      const first = (await generateName("female", i)).split(" ")[0];
      expect(female.has(first) || !male.has(first)).toBe(true);
    }
  });
});

describe("generateName identities", () => {
  it("gives a genderless character a single name", async () => {
    expect((await generateName("genderless", 3)).trim().split(/\s+/)).toHaveLength(1);
  });

  it("uses the matching pool for trans women and men", async () => {
    expect(await generateName("trans-woman", 5)).toBe(await generateName("female", 5));
    expect(await generateName("trans-man", 5)).toBe(await generateName("male", 5));
  });
});
