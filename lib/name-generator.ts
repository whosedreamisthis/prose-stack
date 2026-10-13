export type NameGender =
  | "any"
  | "female"
  | "male"
  | "trans-woman"
  | "trans-man"
  | "gender-fluid"
  | "non-binary"
  | "genderless";

export const NAME_GENDERS: { value: NameGender; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "trans-woman", label: "Trans woman" },
  { value: "trans-man", label: "Trans man" },
  { value: "gender-fluid", label: "Gender fluid" },
  { value: "non-binary", label: "Non-binary" },
  { value: "genderless", label: "Genderless" },
];

/**
 * Random full name for a character. faker is large, so it is imported on the first call rather than at page load.
 * faker only knows female and male name pools, so trans women and men use the pool that matches how they live,
 * gender fluid and non-binary characters get either pool at random, and genderless characters get a single name.
 * Pass a seed to get a repeatable name (used by the tests).
 */
export async function generateName(
  gender: NameGender = "any",
  seed?: number,
): Promise<string> {
  const { faker } = await import("@faker-js/faker");
  if (seed !== undefined) faker.seed(seed);
  switch (gender) {
    case "female":
    case "trans-woman":
      return faker.person.fullName({ sex: "female" });
    case "male":
    case "trans-man":
      return faker.person.fullName({ sex: "male" });
    case "genderless":
      return faker.person.lastName();
    default:
      return faker.person.fullName();
  }
}
