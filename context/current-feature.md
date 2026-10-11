# Current Feature: Authentication (Clerk Sign-in & Registration)

Sign-in and registration via Clerk, with users mirrored into the database by `clerkId`. Spec: `context/features/auth-spec.md`.

## Status

In Progress

## Goals

- Sign-in methods: email/password and Google, enabled in the Clerk dashboard
- Sign-in page at `/sign-in` and register page at `/register`, using Clerk's components
- Env: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register`
- Clerk middleware protects app routes (`/projects/**`, APIs) and resolves `userId`
- Public routes: `/`, `/sign-in`, `/register`, `/api/webhooks/clerk`
- Landing page `/` redirects signed-in users to `/projects`
- Clerk `UserButton` avatar in the top navbar, with sign out
- `/api/webhooks/clerk` handles `user.created` (create `User` with `clerkId`, `email`, `name`) and `user.deleted` (delete `User`), verified with `verifyWebhook` and `CLERK_WEBHOOK_SIGNING_SECRET`
- A user who signs in before the webhook arrives is still created in the DB (fallback on first request)
- Unauthenticated access to a protected route redirects to `/sign-in`
- Unit tests for the webhook handler and the user-creation fallback (mocked Prisma)

## Notes

- Uses the existing `User` model and migration from Database Setup; no new migration expected
- Every query is scoped by the signed-in user's `userId`; never trust client-supplied ownership
- Webhook must reject requests with an invalid signature
- Demo users are temporary Clerk users created by the Try demo button; handled in `demo-spec.md`, not here
- Env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `CLERK_WEBHOOK_SIGNING_SECRET`; update `.env.example`
- Google sign-in works with Clerk's shared dev credentials; production needs your own Google OAuth client
- This Next.js version has breaking changes (see AGENTS.md); read the relevant guide in `node_modules/next/dist/docs/` before writing code (middleware may be renamed)
- The `auth-spec.md` edit (sign-in methods) is uncommitted in the working tree

## Completed Features

- **Database Setup:** Prisma 7 on Neon via driver adapter, server-only client in `lib/db.ts`, `init_user` migration, Vitest with shared Prisma mock.
