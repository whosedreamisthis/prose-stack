# Current Feature

<!-- Feature name and short description -->

## Status

<!-- Not Started | In Progress | Completed -->

Completed

## Goals

<!-- Goals and requirements -->

## Notes

<!-- Any extra notes -->

## Completed Features

<!-- One line per completed feature, earliest to latest. Full details in context/feature-history.md -->

- **Initial setup:** Next.js 16 + React 19, TypeScript, Tailwind v4, ESLint; boilerplate removed.
- **Dashboard UI Phase 1:** shadcn/ui with dark mode default; `/dashboard` layout shell with sidebar and top bar.
- **Dashboard UI Phase 2:** sidebar with item types, collections and user area; collapses on desktop, Sheet on mobile.
- **Dashboard UI Phase 3:** dashboard main area: stats cards, collection cards, pinned and recent item cards.
- **Prisma + Neon PostgreSQL Setup:** Prisma 7 with the Neon adapter (`src/lib/db.ts`), initial schema and migration, system type seed.
- **Seed Data:** demo user `demo@devstash.io` with 5 collections and 18 items.
- **Dashboard Collections:** collection cards and stats from the database (`src/lib/db/collections.ts`).
- **Dashboard Items:** pinned, recent items and item stats from the database (`src/lib/db/items.ts`).
- **Stats & Sidebar:** sidebar types and collections from the database.
- **Add Pro Badge to Sidebar:** PRO badge on Pro-only types from `isProOnly`.
- **Auth Setup - NextAuth + GitHub Provider:** Auth.js v5 split config (`src/auth.config.ts`, `src/auth.ts`), JWT sessions, `src/proxy.ts` route guard.
- **Auth Credentials - Email/Password Provider:** Credentials provider with bcrypt, `POST /api/auth/register`, Zod schemas in `src/lib/validations/auth.ts`.
- **Auth UI - Sign In, Register & Sign Out:** custom `/sign-in` and `/register` pages, auth server actions, sidebar user menu.
- **Email Verification on Register:** Resend emails (`src/lib/email.ts`), hashed tokens (`src/lib/verification.ts`), `/verify-email`.
- **Email Verification Toggle:** `EMAIL_VERIFICATION_ENABLED=false` turns verification off.
- **Forgot Password:** `/forgot-password` and `/reset-password` with single-use emailed links; token helpers in `src/lib/tokens.ts`.
- **Profile Page:** `/profile` with user info, usage stats, change password and delete account (`src/lib/account.ts`).
- **Auth Rate Limiting:** first limiter stored in Neon (replaced by Upstash below).
- **Rate Limiting for Auth (Upstash):** Upstash sliding-window limits on all auth flows (`src/lib/rate-limit.ts`), fails open; Sonner toasts.
- **Fix Dashboard Showing Demo User Data:** dashboard and sidebar use the session user.
- **Items List View:** `/items/[type]` grid of the user's items with loading skeletons.
- **Vitest Setup:** Vitest for server actions and utilities; tests sit next to the code as `*.test.ts`.
- **Item Drawer:** item details in a right-side Sheet via `GET /api/items/[id]`, with a per-page detail cache.
- **Item Drawer Edit Mode:** inline edit form and `updateItem` action with Zod validation (`src/lib/validations/items.ts`).
- **Delete Item:** delete confirmation dialog and `deleteItem` action.
- **Item Create:** `NewItemDialog` and `createItem` action; the type is looked up by slug on the server.
- **Item Type Dropdown:** type picker became a shadcn Select.
- **Code Editor:** Monaco `CodeEditor` for snippets and commands; type-specific "New X" buttons on items pages.
- **Markdown Editor:** `MarkdownEditor` with Write/Preview tabs for notes and prompts.
- **File & Image Upload:** UploadThing uploads with server-signed upload tokens, `FileUpload` component, download proxy `/api/items/[id]/file`; no Pro check yet.
- **Image Gallery View:** `/items/images` shows `ImageThumbnailCard` thumbnails in a 1/2/3-column gallery; layout shared via `src/lib/item-grid.ts`.
- **File List View:** `/items/files` shows `FileListRow` rows with extension icons (`src/lib/file-icons.ts`, `FileTypeIcon`) and a Download button.
- **Quick Copy on Cards:** `CopyButton` on `ItemCard` copies `ItemSummary.copyText` (content or URL) without opening the drawer.
- **Audit Fixes:** item field length limits (`ITEM_LIMITS`), `NewItemDialog` split with shared `src/lib/item-fields.ts`, no SVG uploads, no Monaco import errors in TS snippets.
- **Extract Helpers Refactor:** `toTagLinks`, `createUser` (`src/lib/db/users.ts`), `getSessionUserId` (`src/lib/session.ts`), split `Sidebar` links, upload hooks moved to `src/hooks/`.
- **Collection Create:** top bar `NewCollectionDialog` (name + description) with `createCollection` action (`src/actions/collections.ts`), user-scoped query and Zod schema; refreshes on save.
- **Add Items to Collections:** `CollectionSelector` multi-select in the new/edit item forms, options from `GET /api/collections`; queries link only the user's own collections.
- **Collections Pages:** `/collections` grid of `CollectionCard`s and `/collections/[id]` with streamed `ItemCard`s; clicked collections show their name instantly (`src/lib/collection-preview.ts`).
- **Collection Card Actions:** Edit/Delete (items kept) via `EditCollectionDialog` and `DeleteCollectionDialog` in the collection header and a `CollectionCard` 3-dot menu; Favorite shown but disabled.
- **Global Search / Command Palette:** Cmd+K / Ctrl+K `CommandPalette` fuzzy searches items and collections in the browser, with data from the `getSearchData` action (`src/actions/search.ts`); the TopBar search box opens it.
- **Pagination:** server-side `?page=N` pagination (21 per page) on `/items/[type]`, `/collections` and `/collections/[id]` via `src/lib/pagination.ts` and the `Pagination` component.
- **Replace API Routes with Server Actions:** `getItem`, `getCollectionOptions` and `registerUser` actions replace `/api/items/[id]`, `/api/collections` and `/api/auth/register`; only callback/file routes remain.
- **Settings Page:** protected `/settings` with change password and delete account (moved from `/profile`, components in `src/components/settings/`), linked from the sidebar user menu.
- **Editor Preferences Settings:** auto-saving Editor section on `/settings` (font, tab size, wrap, minimap, theme) stored in `User.editorPreferences`, shared via `EditorPreferencesContext` and applied to `CodeEditor`.
- **Favorites Page:** protected `/favorites` (TopBar star link) with compact monospace Items and Collections lists from `getFavoriteItems`/`getFavoriteCollections`; components in `src/components/favorites/`.
- **Favorite Toggle:** optimistic favorite toggles (`useFavoriteToggle`) in the item drawer, item/image cards (`ItemFavoriteButton`), collection header and card menu via `setItemFavorite`/`setCollectionFavorite` actions.
- **Favorites Sorting:** per-section sort dropdowns on `/favorites` (items: date/name/type, collections: date/name) in `FavoritesList`, with helpers in `src/lib/favorites-sort.ts`.
- **Pinned Items:** item drawer Pin button toggles pins optimistically with toasts via the `toggleItemPin` action and shared `useOptimisticToggle` hook; pinned items lead listings and the dashboard.
- **Homepage Mockup:** static marketing homepage prototype in `prototypes/homepage/` with an animated "chaos to order" hero; app cards gained type-colored top borders with hover outlines (`ITEM_TYPE_BORDER_COLORS`).
- **Homepage:** real `/` marketing page from `src/components/homepage/` sections with content in `src/lib/homepage-content.ts`, tested `src/lib/chaos-physics.ts`, and a shared `Logo` linking home.
- **Fix Cluttered Top Bar on Small Screens:** top bar create buttons collapse to icons below `lg` via a `compact` dialog prop (`src/lib/compact-button.ts`); shortcut badge hidden below `md`.
- **UI Review Fixes:** Playwright review fixes: full-width mobile item drawer, stacked mobile `ItemCard`, homepage `HomeMobileMenu`, `scrollbar-thin`, no autofill in item/collection form fields.
- **Homepage Nav on Auth Pages:** `/sign-in` and `/register` show `HomeNav` (new `page` prop, `/#…` section links via `getSectionLinks`) above `AuthCard` with its `belowNav` option.
- **Stripe Integration Phase 1 - Core Infrastructure:** lazy Stripe client (`src/lib/stripe.ts`), plan gating in `src/lib/usage-limits.ts`, `isPro` on the session via `getSessionUser()`, subscription sync in `src/lib/billing.ts` and `src/lib/db/billing.ts`.
- **Stripe Integration Phase 2 - Integration & UI:** `/api/webhooks/stripe`, Checkout/Portal actions (`src/actions/billing.ts`), Billing section on `/settings` (`src/components/billing/`), free-tier limits on items, collections and uploads.
- **Pro Gate on File & Image Pages:** free users get `ProUpgradePrompt` on `/items/files` and `/items/images`, and disabled File/Image options in the new item type dropdown (`PlanProvider` / `useHasProAccess`).
- **Upgrade Page:** top bar "Upgrade" link for free users to protected `/upgrade` with Free/Pro `UpgradePlans` and monthly/yearly checkout (`useCheckout`); same plans in `ProUpgradePrompt`.
- **Language Dropdown:** `LanguageSelector` Select above the code editor in new/edit item forms; `CODE_LANGUAGES` and `getCodeLanguageLabel` in `src/lib/code-editor.ts` show names like TypeScript.
- **Shared App Layout (Snappier Navigation):** app pages moved into a `src/app/(app)/` route group with one `DashboardShell` layout, so the shell stays mounted and loading skeletons show instantly.
- **Page Skeletons & Cached isPro:** `loading.tsx` skeletons for dashboard, favorites, profile, settings and upgrade; the `jwt` callback's `isPro` read is `getUserIsPro`, wrapped in React `cache()`.
- **AI Auto-Tagging:** Pro "Suggest Tags" button beside the tags input (`TagSuggestions`) via the `generateAutoTags` action and Gemini `gemini-3.8-flash`; foundation in `src/lib/ai.ts` and `src/lib/ai-tags.ts`.
- **AI Description Generator:** Pro Sparkles button beside the description input (`DescriptionGenerator`) fills a 1-2 sentence description via the `generateDescription` action; prompt helpers in `src/lib/ai-description.ts`.
- **UI Layout & Accessibility Fixes:** sidebar active-link highlighting with Dashboard/Favorites links, shared `PageHeader`, collection back link, skip link, inert collapsed sidebar, heading order and ARIA fixes.
- **Actions Refactor - Shared Helpers:** `runUserAction` and `GENERIC_ERROR` (`src/lib/action-result.ts`), `idSchema`, `firstIssueMessage`/`toFirstFieldErrors` (`src/lib/validations/`), `ActionResult<T>` (`src/types/actions.ts`) and `runAiAction` dedupe `src/actions`.
- **Components Refactor 1 - Shared Item Form Fields:** `ItemFormFields` component and `useItemFormValues` hook shared by `NewItemForm` and `ItemEditForm`; `toItemFormValues` in `src/lib/item-fields.ts`; edit form clears field errors.
- **Components Refactor 2 - Shared Dialogs & Form Pieces:** `CollectionFormFields`, `ItemOpenOverlay`, `ConfirmDeleteDialog` (`src/components/shared/`) and `FormError`/`FormSuccess`/`SubmitButton` (`src/components/auth/FormMessages.tsx`) replace duplicated markup.
- **Components Refactor 3 - FileUpload Split:** `useFileUpload` hook (`src/hooks/`) holds upload state and UploadThing wiring; `UploadDropzone` and `UploadProgressBar` components slim `FileUpload` to about 125 lines.
- **Components Refactor 4 - Small Shared Helpers:** `formatItemCount`/`DATE_WITH_YEAR_FORMATTER` (`src/lib/format.ts`), `FavoriteStar`, `useCopyToClipboard`, `useCollectionActions`; `ItemContent`, `ItemDetailSkeleton` and `SettingRow` in their own files.
- **Fix Search Too Fuzzy:** command palette matches whole words via `scoreSearchMatch` (`src/lib/search.ts`) ranked by field, searches item language, and keeps the query between opens.
- **Demo / Recruiter Access:** "Try the Demo" creates a temporary Pro sandbox account (`startDemo`, `demo` provider, `src/lib/db/demo.ts`, `src/lib/demo-content.ts`); `DEMO_ONLY_MODE` turns off regular auth; 24-hour cleanup.
