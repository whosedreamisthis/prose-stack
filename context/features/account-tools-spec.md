# Account & Tools — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Account & Tools, §4 Tech Stack, §8 Routes.

## Summary

Authentication, PDF export, the demo account, and autosave.

## Requirements
- **Auth:** sign in / register with Clerk; user avatar in the top navbar. Clerk middleware protects app routes.
- **User sync:** Clerk webhook (`user.created` / `user.deleted`) syncs users to the DB by `clerkId`.
- **Export to PDF:** render the book view with print styles (or a PDF library) from the same paginated content.
- **Demo:** a Try demo button creates a temporary, private, seeded user that expires after 12 hours (5 per IP per day); see [demo-spec.md](demo-spec.md).
- **Autosave:** debounced while writing (see [manuscript-spec.md](manuscript-spec.md)).

## Data
- `User` (`clerkId`, `email`, `name`, `isDemo`).

## Routes
- `/`, `/(auth)/sign-in`, `/(auth)/register`
- `/api/webhooks/clerk`

## Acceptance criteria
- Webhook signature verified with `CLERK_WEBHOOK_SIGNING_SECRET`.
- Signed-in users visiting `/` redirect to `/projects`.
- All data access scoped by `userId`.

## Open questions
- PDF export: browser print styles or a PDF library?
