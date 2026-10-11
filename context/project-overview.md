# 📖 ProseStack — Project Overview

> **A focused home for writing your novel: manuscript, characters, places, plot, and research in one place.**

---

## Table of Contents

1. [Problem](#1-problem)
2. [Target Users](#2-target-users)
3. [Features](#3-features)
4. [Tech Stack](#4-tech-stack)
5. [Architecture](#5-architecture)
6. [Data Model](#6-data-model)
7. [Prisma Schema](#7-prisma-schema)
8. [Routes](#8-routes)
9. [Monetization](#9-monetization)
10. [UI / UX](#10-ui--ux)
11. [Development Rules](#11-development-rules)
12. [Open Questions](#12-open-questions)
13. [Reference Links](#13-reference-links)

---

## 1. Problem

Novelists juggle a manuscript in a word processor, character notes in another document, plot outlines on index cards or spreadsheets, and research scattered across bookmarks and folders. Context is lost every time they switch tools, and it is hard to see how a scene connects to the plot while writing it.

ProseStack keeps everything for a book in one workspace, and links the planning material (plot points, characters, places) directly to the scenes being written.

---

## 2. Target Users

- **Novelists** (first-time and experienced) drafting long-form fiction.
- **Plotters** who outline with index cards and plot lines before writing.
- **Pantsers** who want light structure and a place to capture characters and places as they go.
- **Writers with several projects** on the go who need to switch between books easily.

---

## 3. Features

### Manuscript

- Collapsible tree: **Book → Part → Chapter → Scene**; double-click any item to rename.
- Scene editor with breadcrumbs, undo/redo, find & replace, font size, thesaurus, read-aloud, and spell check.
- **Add a scene** button at the end of each chapter.
- Footer stats: total words, pages, words today.
- **Book view:** the root of the tree renders the manuscript as paginated book pages, starting with a title page (title, subtitle, "by", author).
- New projects are seeded with Chapter 1 / Scene 1 ("Once upon a time...").

### Characters

- Sketch document per character (age, location, role, goal, appearance, personality, occupation, habits, background, internal/external conflicts, notes).
- Split into **Main** and **Supporting** characters.
- **Name generator:** a Generate name button returns a random name, powered by `@faker-js/faker` (client-side, no API). See `context/features/name-generator-spec.md`.

### Places

- Place cards with sketch fields (location, role, related characters, season, features, description, sights, sounds, smell, notes).

### Plot

- **Plot points:** draggable index cards with optional labels.
- **Scenes:** cards with a summary, label, and ellipsis menu (send to trash).
- **Plot lines grid:** scenes down the left, plot lines across; adding a plot point on a scene's row links it to the scene.
- The scene editor's right sidebar shows and edits the plot points linked to the scene.

### Notes & Research

- Notes: standalone or in folders.
- Research: notes, links, images, and files, in folders, optionally linked to a character, place, or scene.

### Trash & Archive

- Deleted items go to **Trash** (restore or delete permanently).
- Items can be **archived** and viewed (and unarchived) from an archive page.

### Projects & Settings

- Multiple projects per user, with a project switcher.
- Create-project flow: pick a cover design and color (live recolor) or upload a cover image; enter author, title, subtitle.
- Settings modal: project title, font, font size (10–18), line spacing (single / 1.5 / double), light/dark theme, labels (name + color); Save and Reset to default.

### Account & Tools

- Sign in / register with Clerk; avatar in the top navbar.
- Export to PDF.
- **Try demo** button: creates a temporary, private Clerk user with a seeded project (parts, chapters, scenes, plot lines, characters, places). Each visitor gets their own demo; returning visitors resume their live demo. Demo data is deleted after 12 hours, limited to 5 new demos per IP per rolling 24 hours. Demos cannot be converted to real accounts. See `context/features/demo-spec.md`.
- Debounced autosave while writing.

---

## 4. Tech Stack

| Layer        | Choice                              | Notes                                                                 |
| ------------ | ----------------------------------- | --------------------------------------------------------------------- |
| Framework    | **Next.js 16** + **React 19**       | App Router, SSR pages with dynamic client components                  |
| Language     | **TypeScript**                      | End-to-end type safety                                                |
| Backend      | Next.js Server Actions / API routes | Project, manuscript, plot CRUD; uploads; PDF export                   |
| Database     | **Neon** (serverless PostgreSQL)    | Cloud-hosted, with branching for dev                                  |
| ORM          | **Prisma 7**                        | Uses `prisma.config.ts` + Neon driver adapter                         |
| File storage | **UploadThing**                     | Custom book covers and research images/files                          |
| Auth         | **Clerk**                           | Sign-in / register pages, user avatar; users synced to DB by `clerkId` |
| Rate limiting| **Upstash Redis**                   | `@upstash/ratelimit` sliding window; limits demo creation per IP      |
| Editor       | **Tiptap**                          | Rich text, undo/redo; find/replace extension                          |
| Drag & drop  | **dnd-kit**                         | Plot cards and tree reordering                                        |
| Client state | **Zustand**                         | Preferred over React Context for shared client state                  |
| Read aloud   | Web Speech API                      | Free, built into browsers                                             |
| Name generator | `@faker-js/faker`                 | Client-side, lazy loaded; no API key                                  |
| Thesaurus    | Datamuse API                        | Free; proxied through a server route                                  |
| Spell check  | Browser spellcheck (or `nspell`)    | Start with native; swap if more control needed                        |
| Styling      | **Tailwind CSS v4** + **shadcn/ui** | Lucide icons                                                          |
| Testing      | **Vitest**                          | Unit tests for server actions and utilities (no component tests)      |
| Repo         | Single codebase                     | Less overhead                                                         |

### Prisma 7 setup notes

Prisma 7 changed how connections are configured:

- The connection URL **no longer goes in `schema.prisma`**; it moves to `prisma.config.ts`.
- Generator is now `prisma-client` (not `prisma-client-js`) with an explicit `output` path; import the client from that generated path, **not** `@prisma/client`.
- A **driver adapter is required** — for Neon, use `@prisma/adapter-neon`.
- Use two env vars: a **pooled** URL for the app and a **direct (unpooled)** URL for CLI/migrations.

```ts
// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: env("DATABASE_URL_UNPOOLED"), // direct connection for migrations
  },
});
```

```ts
// lib/db.ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Environment variables

```bash
# Database (Neon)
DATABASE_URL=              # pooled — used by the app
DATABASE_URL_UNPOOLED=     # direct — used by Prisma CLI / migrations

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
CLERK_WEBHOOK_SIGNING_SECRET=   # user.created / user.deleted sync

# File storage (UploadThing)
UPLOADTHING_TOKEN=

# Rate limiting (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Demo
DEMO_COOKIE_SECRET=         # signs the demo resume cookie
CRON_SECRET=                # protects the demo cleanup job
```

---

## 5. Architecture

```
Browser (React client components: editor, tree, plot board)
   │  Server Actions (debounced autosave, CRUD)
   ▼
Next.js server (App Router)
   ├─ Clerk middleware → protects app routes, resolves userId
   ├─ Server Actions / route handlers → Zod validation → Prisma
   ├─ /api/demo → rate limit (Upstash) → create/resume demo user
   ├─ /api/cron/cleanup-demos → deletes expired demo users (12 h)
   ├─ /api/thesaurus → Datamuse proxy
   └─ /api/uploadthing → cover and research uploads
   ▼
Neon PostgreSQL (via Prisma + driver adapter)
```

- **Server components** load the project tree and page data; **client components** handle the editor, drag and drop, and modals.
- **Project scoping:** every query filters by the signed-in user's `userId` and the active `projectId`.
- **Autosave:** the editor debounces changes (≈1–2 s idle, plus on blur and navigation, and a periodic flush during continuous typing), saves only the changed scene, and shows a Saving/Saved indicator. A local copy lets failed saves retry.
- **Soft delete:** deleting sets `trashedAt` (and archiving sets `archivedAt`) instead of removing rows; "delete permanently" removes them. Trashing a part or chapter trashes its descendants.
- **Ordering:** siblings are ordered by an integer `position`; reordering updates positions in one transaction.
- **Word counts:** each scene stores its `wordCount`; project totals are sums. "Words today" comes from `DailyWordCount` snapshots.
- **PDF export:** the book view is rendered with print styles (or a PDF library) from the same paginated content.

---

## 6. Data Model

### Entities

- **User** — mirrors a Clerk user (`clerkId`); owns projects. Demo users are flagged `isDemo` and carry a `demoExpiresAt`.
- **Project** — one book: title, subtitle, author, cover (design, color, or uploaded image), formatting settings, theme.
- **ManuscriptNode** — a Part, Chapter, or Scene in a self-referencing tree. Scenes hold the content, summary, word count, and optional label.
- **Character** / **Place** — sketches (Place links to related characters).
- **PlotLine** → **PlotPoint** — plot points belong to a plot line, are ordered, and can link to a scene.
- **Label** — name and color; applied to scenes and plot points.
- **NoteFolder** / **Note**, **ResearchFolder** / **ResearchItem**.
- **DailyWordCount** — snapshot of the project total at the start of each day, used to compute words today.

### Design decisions

- **One tree table for the manuscript** (rather than Part/Chapter/Scene tables) so rename, reorder, trash, and archive logic is shared. A `type` enum and validation rules keep the hierarchy valid (Part → Chapter → Scene; chapters can sit directly under the book).
- **Editor content stored as Tiptap JSON** (`Json`), plus plain-text word count for stats.
- **Trash/archive as nullable timestamps** on each entity, not separate tables, so restoring is a single update.
- **Settings as columns on Project** (font, size, line spacing, theme) with defaults, so "Reset to default" just rewrites defaults.
- **Plot point ↔ scene** is one-to-one: `PlotPoint.sceneId` is optional and unique, so a scene has at most one plot point and a plot point links to at most one scene.

---

## 7. Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  // URL lives in prisma.config.ts (Prisma 7)
}

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

enum NodeType {
  PART
  CHAPTER
  SCENE
}

enum CharacterRole {
  MAIN
  SUPPORTING
}

enum ResearchType {
  NOTE
  LINK
  IMAGE
  FILE
}

enum Theme {
  LIGHT
  DARK
}

enum LineSpacing {
  SINGLE
  ONE_AND_HALF
  DOUBLE
}

// ─────────────────────────────────────────────
// Users & projects
// ─────────────────────────────────────────────

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String?  @unique
  name      String?
  isDemo    Boolean  @default(false)
  demoExpiresAt DateTime? // set for demo users: createdAt + 12 h
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects Project[]

  @@index([isDemo, demoExpiresAt])
}

model Project {
  id       String  @id @default(cuid())
  userId   String
  title    String
  subtitle String?
  author   String

  // Cover: a design + color, or an uploaded image
  coverDesign   String  @default("classic")
  coverColor    String  @default("#1e3a5f")
  coverImageUrl String?

  // Formatting settings
  fontFamily  String      @default("Georgia")
  fontSize    Int         @default(12) // 10–18
  lineSpacing LineSpacing @default(DOUBLE)
  theme       Theme       @default(LIGHT)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  nodes          ManuscriptNode[]
  characters     Character[]
  places         Place[]
  plotLines      PlotLine[]
  labels         Label[]
  noteFolders    NoteFolder[]
  notes          Note[]
  researchFolders ResearchFolder[]
  researchItems  ResearchItem[]
  dailyWordCounts DailyWordCount[]

  @@index([userId])
}

model Label {
  id        String  @id @default(cuid())
  projectId String
  name      String
  color     String

  project    Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  nodes      ManuscriptNode[]
  plotPoints PlotPoint[]

  @@index([projectId])
}

// ─────────────────────────────────────────────
// Manuscript
// ─────────────────────────────────────────────

model ManuscriptNode {
  id        String   @id @default(cuid())
  projectId String
  parentId  String?
  type      NodeType
  title     String
  position  Int      @default(0)

  // Scene-only fields
  content   Json?
  summary   String?
  wordCount Int      @default(0)
  labelId   String?

  trashedAt  DateTime?
  archivedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  project    Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent     ManuscriptNode?  @relation("NodeTree", fields: [parentId], references: [id], onDelete: Cascade)
  children   ManuscriptNode[] @relation("NodeTree")
  label      Label?           @relation(fields: [labelId], references: [id], onDelete: SetNull)
  plotPoint  PlotPoint?

  @@index([projectId, parentId, position])
}

// ─────────────────────────────────────────────
// Characters & places
// ─────────────────────────────────────────────

model Character {
  id        String        @id @default(cuid())
  projectId String
  role      CharacterRole @default(MAIN)
  name      String
  age       String?
  location  String?

  roleInStory        String?
  goal               String?
  physicalDescription String?
  personality        String?
  occupation         String?
  habits             String?
  background         String?
  internalConflicts  String?
  externalConflicts  String?
  notes              String?

  trashedAt  DateTime?
  archivedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  places  Place[] @relation("PlaceCharacters")

  @@index([projectId, role])
}

model Place {
  id        String @id @default(cuid())
  projectId String
  name      String
  location  String?

  roleInStory    String?
  season         String?
  uniqueFeatures String?
  description    String?
  sights         String?
  sounds         String?
  smell          String?
  notes          String?

  trashedAt  DateTime?
  archivedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  project           Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  relatedCharacters Character[] @relation("PlaceCharacters")

  @@index([projectId])
}

// ─────────────────────────────────────────────
// Plot
// ─────────────────────────────────────────────

model PlotLine {
  id        String @id @default(cuid())
  projectId String
  name      String
  color     String?
  position  Int    @default(0)

  trashedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  project Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  points  PlotPoint[]

  @@index([projectId, position])
}

model PlotPoint {
  id          String  @id @default(cuid())
  plotLineId  String
  sceneId     String? @unique // one-to-one link to a scene in the plot grid
  labelId     String?
  title       String
  description String?
  position    Int     @default(0)

  trashedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  plotLine PlotLine         @relation(fields: [plotLineId], references: [id], onDelete: Cascade)
  scene    ManuscriptNode?  @relation(fields: [sceneId], references: [id], onDelete: SetNull)
  label    Label?           @relation(fields: [labelId], references: [id], onDelete: SetNull)

  @@index([plotLineId, position])
}

// ─────────────────────────────────────────────
// Notes & research
// ─────────────────────────────────────────────

model NoteFolder {
  id        String  @id @default(cuid())
  projectId String
  parentId  String?
  name      String

  project  Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent   NoteFolder?  @relation("NoteFolderTree", fields: [parentId], references: [id], onDelete: Cascade)
  children NoteFolder[] @relation("NoteFolderTree")
  notes    Note[]

  @@index([projectId])
}

model Note {
  id        String  @id @default(cuid())
  projectId String
  folderId  String?
  title     String
  content   Json?

  trashedAt  DateTime?
  archivedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  project Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  folder  NoteFolder? @relation(fields: [folderId], references: [id], onDelete: SetNull)

  @@index([projectId, folderId])
}

model ResearchFolder {
  id        String @id @default(cuid())
  projectId String
  name      String

  project Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  items   ResearchItem[]

  @@index([projectId])
}

model ResearchItem {
  id          String       @id @default(cuid())
  projectId   String
  folderId    String?
  type        ResearchType
  title       String
  content     Json?   // for NOTE
  url         String? // for LINK, IMAGE, FILE
  description String?

  trashedAt  DateTime?
  archivedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  project Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  folder  ResearchFolder? @relation(fields: [folderId], references: [id], onDelete: SetNull)

  @@index([projectId, folderId])
}

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

model DailyWordCount {
  id        String   @id @default(cuid())
  projectId String
  date      DateTime @db.Date
  startTotal Int     // project word total at the start of the day

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, date])
}
```

---

## 8. Routes

| Route                                  | Purpose                                              |
| -------------------------------------- | ---------------------------------------------------- |
| `/`                                    | Landing page with Try demo (redirects to projects when signed in) |
| `/(auth)/sign-in`                      | Clerk sign-in                                        |
| `/(auth)/register`                     | Clerk sign-up                                        |
| `/projects`                            | Project list, switcher, create project               |
| `/projects/[projectId]/manuscript`     | Manuscript tree + scene editor                       |
| `/projects/[projectId]/manuscript/book`| Paginated book view                                  |
| `/projects/[projectId]/characters`     | Character sketches (main / supporting)               |
| `/projects/[projectId]/places`         | Place cards                                          |
| `/projects/[projectId]/plot`           | Plot points, scene cards, and plot lines grid        |
| `/projects/[projectId]/notes`          | Notes and folders                                    |
| `/projects/[projectId]/research`       | Research items                                       |
| `/projects/[projectId]/archive`        | Archived items                                       |
| `/projects/[projectId]/trash`          | Trashed items (restore / delete permanently)         |
| `/api/demo`                            | Create or resume a demo (rate limited via Upstash)   |
| `/api/cron/cleanup-demos`              | Scheduled cleanup of expired demos (`CRON_SECRET`)   |
| `/api/thesaurus`                       | Datamuse proxy                                       |
| `/api/uploadthing`                     | UploadThing handler                                  |
| `/api/webhooks/clerk`                  | Clerk user sync                                      |

Project settings open as a modal, not a route. Individual scenes, characters, and places are selected via the sidebar (optionally with a `?id=` query param or nested segment).

---

## 9. Monetization

Not decided. The app starts free. If monetization is added later, likely levers are the number of projects, cover/research file storage, and PDF export; Stripe subscriptions would be the natural fit.

---

## 10. UI / UX

### General

- Calm, distraction-free, writer-focused
- **Light mode by default**, dark mode optional (per-project setting)
- Clean typography, generous whitespace
- Subtle borders and shadows

### Layout

- **Left sidebar:** collapsible tree/list for the current page; becomes a drawer on small screens.
- **Right sidebar:** contextual panel (plot connections in the scene editor); also collapsible.
- **Top navbar:** project switcher, spell check, **Export to PDF**, settings, Clerk avatar (right side).
- **Editor:** breadcrumbs, then toolbar (undo/redo, find & replace, font size, thesaurus, read aloud), then the writing area, then a stats footer.
- **Book view:** page-shaped panels with a title page first.
- Plot cards support drag and drop; ellipsis menus hold per-card actions (trash).

---

## 11. Development Rules

> 🚫 **Never use `prisma db push` or change the database structure directly.**

All schema changes go through migrations:

```bash
# Development: create + apply a migration
npx prisma migrate dev --name <descriptive_name>

# Production: apply existing migrations only
npx prisma migrate deploy
```

Other conventions:

- All data access is scoped by `userId` (and `projectId`) — never trust client-supplied ownership.
- Validate all input with a schema library (e.g. Zod) on the server.
- Deleting moves items to trash (`trashedAt`); only "delete permanently" removes rows.
- Use **Zustand** for shared client state (sidebar open/closed, active project, editor save status, plot board, modals) instead of React Context wherever state is shared across components. Reserve Context for things Clerk or a library already provides. Server data still comes from server components and Server Actions, not Zustand.
- Use Neon branches for dev/preview databases so migrations can be tested before prod.
- Unit test server actions and utilities with Vitest (`npm test`); tests mock the database and never touch Neon.
- This Next.js version has breaking changes — read the relevant guide in `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).

---

## 12. Open Questions

- **Research page:** is the proposed note/link/image/file model right?
- **Autosave cadence:** confirm the debounce interval (≈1–2 s) and periodic flush.
- **PDF export:** browser print styles or a PDF library?
- **Spell check:** native browser spellcheck, or `nspell` for control?
- **Book view:** should each chapter start on a new page?
- **Collaboration and monetization:** needed later?

---

## 13. Reference Links

| Area                    | Link                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| Next.js                 | https://nextjs.org/docs                                              |
| React                   | https://react.dev                                                    |
| Prisma 7 docs           | https://www.prisma.io/docs                                           |
| Prisma 7 upgrade guide  | https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7              |
| Prisma config reference | https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference  |
| Neon + Prisma           | https://neon.com/docs/guides/prisma                                  |
| Clerk (Next.js)         | https://clerk.com/docs/nextjs                                        |
| UploadThing             | https://docs.uploadthing.com                                         |
| Upstash Ratelimit       | https://upstash.com/docs/redis/sdks/ratelimit-ts/overview            |
| Tiptap                  | https://tiptap.dev/docs                                              |
| dnd-kit                 | https://docs.dndkit.com                                              |
| Web Speech API          | https://developer.mozilla.org/docs/Web/API/Web_Speech_API            |
| Datamuse API            | https://www.datamuse.com/api                                         |
| Tailwind CSS v4         | https://tailwindcss.com/docs                                         |
| shadcn/ui               | https://ui.shadcn.com                                                |
| Lucide icons            | https://lucide.dev/icons                                             |
