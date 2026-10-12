# Research Uploads — Feature Spec

Source: [project-overview.md](../project-overview.md) §3 Notes & Research, §4 Tech Stack (UploadThing). Requires [research-spec.md](research-spec.md) (Part 1) to be complete.

## Summary

Adds IMAGE and FILE research items: upload an image or a document into the Research library, view or download it, and keep storage tidy when items are deleted.

## Approach

- **UploadThing** (`uploadthing` + `@uploadthing/react`, not installed yet). A file router at `/api/uploadthing` with two endpoints, `researchImage` and `researchFile`.
- The router's middleware checks the signed-in user (`getCurrentUser`) and that they own the project passed with the upload; uploads by anyone else are refused before any bytes are stored.
- `onUploadComplete` creates the `ResearchItem` (type, title from the file name, `url`, `fileKey`, `fileName`, `fileSize`, `mimeType`, folder) on the server; the client never sends the URL itself.
- Read the UploadThing docs (Context7) for the current Next.js App Router setup before writing code.

## Requirements

### Uploading
- Folder row menu and the Research `+` menu gain **Upload image** and **Upload file**. The item lands in that folder (or the top level).
- Drag files from the desktop onto a folder row or the empty Research pane to upload them.
- An upload shows progress in the new row; a failed upload removes the row and shows a toast with the reason (wrong type, too large, storage full).

### Viewing
- **IMAGE:** title, the image fitted to the pane (click for full size in a new tab), description.
- **FILE:** title, file name, size and type, a **Download** button, description. PDFs also get "Open in new tab".
- Rename, Move to…, Link to…, Archive and Trash work as for notes and links. Export as PDF is not offered for uploads.

### Limits
- Images: JPEG, PNG, WebP, GIF, up to 4 MB each.
- Files: PDF, TXT, DOCX, up to 8 MB each.
- 100 MB of research storage per project (sum of `fileSize` of live, archived and trashed items); an upload past it is refused with a clear message.
- Type and size are enforced by the file router on the server, not only in the picker.

### Deleting
- Deleting an IMAGE or FILE forever (or a folder holding them) also deletes the stored files with `UTApi.deleteFiles(fileKeys)`.
- The trash-emptying cron and the demo cleanup cron delete stored files the same way before removing rows.
- A storage delete that fails is logged and does not block the database delete (an orphaned file is better than a stuck item).

## Data
- `ResearchItem` gains (if not added in Part 1): `fileKey String?`, `fileName String?`, `fileSize Int?`, `mimeType String?`.
- No new models.

## Routes
- `/api/uploadthing` (UploadThing file router)
- `next.config.ts`: allow the UploadThing image host in `images.remotePatterns` so images can use `next/image`.

## Environment
- `UPLOADTHING_TOKEN` in `.env` and on Vercel.

## Demo seed
- No uploaded files in the seed. The demo user can upload within the same limits; the demo cleanup removes their files.

## Acceptance criteria
- Uploads of the wrong type or size are refused by the server.
- An upload to a project the user doesn't own is refused in the router's middleware.
- The storage cap is checked on the server before the upload is accepted.
- Deleting forever (by hand, by the trash cron or by demo cleanup) removes the stored files.
- Unit tests cover the middleware ownership check, the storage-cap check, and file deletion on delete forever (UTApi mocked).

## Decided
- Types, sizes and the 100 MB per-project cap stay as listed above; they cover reference photos, maps and source documents without large storage costs.
- No thumbnails in the sidebar tree: type icons only, so the tree stays compact. The image shows in the main pane.
