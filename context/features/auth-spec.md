# Authentication (Clerk Sign-in & Registration) — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Account & Tools, §4 Tech Stack, §5 Architecture, §8 Routes.

## Summary

Sign-in and registration via Clerk, with users mirrored into the database by `clerkId`.

## Requirements
- **Sign-in** page at `/sign-in` and **register** page at `/register`, using Clerk's components.
- Env: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register`.
- **Clerk middleware** protects app routes (`/projects/**`, APIs) and resolves `userId`.
- Public routes: `/`, `/sign-in`, `/register`, `/api/webhooks/clerk`.
- Landing page `/` redirects signed-in users to `/projects`.
- Avatar (Clerk `UserButton`) in the top navbar, with sign out.
- **User sync:** `/api/webhooks/clerk` handles `user.created` and `user.deleted`, verified with `verifyWebhook` and `CLERK_WEBHOOK_SIGNING_SECRET`.
  - `user.created`: create `User` (`clerkId`, `email`, `name`).
  - `user.deleted`: delete `User`; projects cascade.
- Demo users: temporary Clerk users created by the Try demo button; see [demo-spec.md](demo-spec.md).

## Data
- `User` (`clerkId` unique, `email`, `name`, `isDemo`).

## Env vars
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `CLERK_WEBHOOK_SIGNING_SECRET`.

## Acceptance criteria
- Unauthenticated access to a protected route redirects to `/sign-in`.
- Every query is scoped by the signed-in user's `userId`; never trust client-supplied ownership.
- Webhook rejects requests with an invalid signature.
- A user who signs in before the webhook arrives is still created in the DB (fall back to creating the `User` on first request).

## Open questions
- Sign-in methods (email/password, Google, etc.)?
