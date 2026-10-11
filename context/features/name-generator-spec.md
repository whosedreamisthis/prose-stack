# Character Name Generator — Feature Spec

Source: new feature. Related: [characters-spec.md](characters-spec.md).

## Summary

A **Generate name** button on the character sketch. Click it, get a random name back.

## Approach

Use **`@faker-js/faker`** with its default English names. It runs offline, is free, and needs no API key or server call.

- `faker.person.fullName()` returns a full name; `faker.person.firstName()` and `faker.person.lastName()` return parts.
- No AI API (e.g. Gemini) is needed.

## Requirements
- **Generate name** button next to the name field in the character sketch.
- Each click generates a new random full name and puts it in the name field.
- Runs client-side, loaded lazily so faker doesn't bloat the main bundle.

## Data
- None. The name is saved through the normal character save.

## Acceptance criteria
- Clicking the button fills the name field with a new name each time.
- Faker is only loaded when the button is first clicked (dynamic import).
- No rate limit or external dependency, so it works for demo users.
- A unit test covers the helper (faker seeded for determinism).

## Possible later additions
- Pick female / male.
- Other languages or cultures.
- Fantasy names, or genre/era-specific names via an AI model.
