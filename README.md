# ProseStack

A writing workspace for novels and long-form fiction. Keep your manuscript, characters, places, plot and research in one place, with the planning material linked to the scenes you are writing.

This project is inspired by [Dabble Writer](https://www.dabblewriter.com/).

## Features

**Writing**
- A manuscript outline of **Book → Part → Chapter → Scene**, with add, rename, drag-and-drop reorder, labels and scene search.
- A rich-text scene editor with autosave, a local backup copy, undo/redo, bold and italic, find and replace, a thesaurus, read-aloud and spell check.
- Read a scene, chapter, part or the whole manuscript as continuous text, or as a paginated **book view** with a title page.
- **Proofread** a scene or a selection: repeated words, double spaces, a/an, missing apostrophes, passive voice, filler words, very long sentences, names spelled two ways and mixed quote styles. It uses free open-source rules only, with no AI and no API key, and you accept, dismiss or always-ignore each suggestion.
- A summary for every scene, chapter and part, and notes on each.

**Planning**
- **Characters** (Main and Supporting sketches, with a random name generator) and **Places**, each with their own notes.
- **Plot lines** on a draggable grid, linked to scenes, with colored labels.
- **Story templates** (such as Three-Act) with beats you tick off and link to scenes.
- **Research**: notes, links, images and files in nested folders.

**Projects and tools**
- Several projects per account, each with its own cover, font, size and line spacing, plus light and dark themes.
- **Trash and Archive** with restore, and export of any item, a chapter, or the whole book to PDF.
- A **Try demo** button that creates a temporary, seeded account (one per visitor, deleted after 12 hours).

## Tech stack

- **Next.js 16** (App Router) and **React 19**, in **TypeScript**
- **Tailwind CSS v4** and **shadcn/ui** (Base UI), with Lucide icons
- **Tiptap** for the editor, **dnd-kit** for drag and drop, **Zustand** for client state
- **Prisma 7** on **Neon** PostgreSQL, through the Neon driver adapter
- **Clerk** for sign-in, **UploadThing** for uploads, **Upstash Redis** for the demo's one-per-visitor lock
- **nspell** and the **retext** family for spelling and proofreading, **pdfkit** for PDF export
- **Vitest** for tests

## Getting started

You will need Node.js 20 or newer, and free accounts with [Neon](https://neon.tech), [Clerk](https://clerk.com), [UploadThing](https://uploadthing.com) and [Upstash](https://upstash.com).

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and fill in each value:

   ```bash
   cp .env.example .env
   ```

   | Variable | What it is |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled connection string, used by the app |
   | `DATABASE_URL_UNPOOLED` | Neon direct connection string, used by Prisma migrations |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk API keys |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-in` and `/register` |
   | `CLERK_WEBHOOK_SIGNING_SECRET` | Signing secret for the Clerk webhook that syncs users to the database |
   | `UPLOADTHING_TOKEN` | UploadThing token, for research uploads |
   | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis, for the demo |
   | `DEMO_COOKIE_SECRET` | Any long random string; signs the demo resume cookie |
   | `CRON_SECRET` | Any long random string; protects the demo cleanup job |

3. Create the database tables:

   ```bash
   npx prisma migrate deploy
   ```

   While developing, use `npx prisma migrate dev` after changing `prisma/schema.prisma`.

4. Start the development server and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm start` | Run the production build |
| `npm run lint` | Check the code with ESLint |
| `npm test` | Run the unit tests once |
| `npm run test:watch` | Run the tests as you edit |

After changing the Prisma schema, run `npx prisma generate` and restart the dev server so it picks up the new client.

## Project layout

```
app/          Routes: pages, parallel-route slots for the sidebars and toolbar, API routes
actions/      Server actions (validated with Zod and scoped to the signed-in user)
components/   React components, grouped by feature
lib/          Logic and configuration, including stores/ for Zustand and proofread/ for the checker
hooks/        React hooks
prisma/       Schema and migrations
context/      Project overview, feature specs, and the feature history
```

The project overview and a spec for each feature are in [context/](context/); start with [context/project-overview.md](context/project-overview.md).

## Deploying

The app is set up for [Vercel](https://vercel.com). Add the environment variables above to the project, and run `npx prisma migrate deploy` against the production database. `vercel.json` schedules a daily cron job that deletes expired demo accounts, so `CRON_SECRET` must be set there too.
