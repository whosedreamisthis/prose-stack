# Current Feature: Database Setup (Prisma 7 + Neon)

Prisma 7 connected to Neon through the driver adapter, a single shared client, the first migration (`User` only), and a Vitest setup that mocks the database. Spec: `context/features/database-spec.md`.

## Status

In Progress

## Goals

- Install deps: `@prisma/client`, `@prisma/adapter-neon`, `zod` (runtime); `prisma`, `dotenv`, `vitest` (dev)
- Add scripts: `test` (`vitest run`), `test:watch` (`vitest`), `postinstall` (`prisma generate`)
- `prisma/schema.prisma` with generator `prisma-client` (`output = "../generated/prisma"`) and a URL-less `postgresql` datasource
- `prisma.config.ts` with schema, migrations path, and `datasource.url` from `DATABASE_URL_UNPOOLED`
- Add `generated/` to `.gitignore`
- `lib/db.ts`: single `prisma` instance via `PrismaNeon` on pooled `DATABASE_URL`, cached on `globalThis` outside production, `server-only`; import from `@/generated/prisma/client`
- First migration `init_user` with the `User` model and `@@index([isDemo, demoExpiresAt])` only
- `.env.example` lists `DATABASE_URL` and `DATABASE_URL_UNPOOLED` with empty values; `.env` is git-ignored
- Vitest: `vitest.config.ts` with `@/` alias, node environment, `include: ["**/*.test.ts"]`; shared `test/mock-prisma.ts`; one smoke test
- Acceptance: `prisma migrate dev` applies `init_user` to Neon `development` branch; `prisma.user.count()` works; `npm test` passes with no DB or env vars; `npm run build` passes and `lib/db.ts` cannot be imported from a client component

## Notes

- Never use `prisma db push`; each later feature adds its own models in its own migration
- Two Neon branches: `development` (local and Vercel Preview) and `production` (Vercel Production)
- Vercel build command: `npx prisma migrate deploy && next build`; scope both DB env vars per environment
- Every query is scoped by the signed-in user's `userId`; validate input with Zod; use `prisma.$transaction` for multi-row changes
- Tests mock `@/lib/db` and never touch Neon; unit tests for server actions and utilities only
- Uncommitted edits to `.env.example` and `database-spec.md` exist in the working tree

## Completed Features
