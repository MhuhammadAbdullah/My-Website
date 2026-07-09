# Calibre Digital — Agency Website Monorepo

A full-stack agency/digital-services platform: a public marketing site, an internal admin panel (CMS + finance/invoicing system), and a shared Express API backed by PostgreSQL.

- **`apps/web`** — public marketing site (Next.js 15, App Router, Turbopack)
- **`apps/admin`** — internal admin panel: content CMS, RBAC, and a full quotation/invoice/payment finance module (Next.js 15)
- **`apps/api`** — Express REST API, Prisma/PostgreSQL, Better Auth, Cloudinary media uploads (Node/TypeScript)
- **`packages/*`** — shared workspace packages consumed by the apps above

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Project structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Local setup](#local-setup)
5. [Environment variables](#environment-variables)
6. [Available scripts](#available-scripts)
7. [Database & data model](#database--data-model)
8. [Authentication & RBAC](#authentication--rbac)
9. [API reference](#api-reference)
10. [Deployment guide (Vercel)](#deployment-guide-vercel)
11. [Known gotchas](#known-gotchas)

---

## Tech stack

| Layer | Technology |
|---|---|
| Monorepo tooling | pnpm workspaces + Turborepo |
| Web / Admin frontend | Next.js 15 (Turbopack), React 19, Tailwind CSS v4, Radix UI, `motion` |
| Forms / validation | `react-hook-form` + `zod` (shared schemas in `@agency/types`) |
| API | Express 4, TypeScript, `tsx` (dev), `helmet`, `compression`, `express-rate-limit`, `cors` |
| Database | PostgreSQL via Prisma ORM (`@agency/database`) |
| Auth | [Better Auth](https://www.better-auth.com/) (email/password, Prisma adapter, shared cookie across `web`/`admin` subdomains) |
| Media | Cloudinary (signed direct-to-cloud uploads) |
| Email | Nodemailer (SMTP) — contact-form notifications |
| Admin extras | `@dnd-kit` (drag-reorder), `recharts` (finance dashboard charts), `@react-pdf/renderer` (invoice/quote PDFs), `xlsx` (report export) |
| Deployment | Vercel (three separate projects — one per app) |

## Project structure

```
My-Website/
├── apps/
│   ├── web/            Next.js — public site (port 3000)
│   ├── admin/           Next.js — admin panel (port 3001)
│   └── api/             Express — REST API (port 4000)
├── packages/
│   ├── database/        Prisma schema, generated client, seed script
│   ├── auth/             Better Auth server + client config (shared by api/admin)
│   ├── types/             Shared Zod schemas + inferred TS types (forms, API payloads)
│   ├── ui/                 Shared React component library (Tailwind-based)
│   ├── utils/               Shared pure helpers (e.g. finance total calculations)
│   └── config/                Shared tsconfig/eslint base configs
├── turbo.json            Task pipeline (dev/build/lint/typecheck/test)
├── pnpm-workspace.yaml
└── package.json           Root scripts (delegate to turbo)
```

Web app routes (`apps/web/src/app`): `/`, `/about`, `/services`, `/services/[slug]`, `/portfolio`, `/portfolio/[slug]`, `/affiliate-tools`, `/contact`, `/privacy-policy`, `/terms`.

Admin app routes (`apps/admin/src/app/(dashboard)`): `home`, `about`, `services`, `portfolio`, `categories`, `testimonials`, `faqs`, `team`, `affiliate`, `navigation`, `footer`, `seo`, `settings`, `analytics`, `finance` (clients/quotations/invoices/payments/reports), `roles`, `permissions`, `users`, plus a public `/login` page.

## Prerequisites

- Node.js **≥ 22** (Vercel projects run on Node 24.x)
- pnpm **11.9.0** (pinned via `packageManager` in `package.json` — use Corepack: `corepack enable`)
- A PostgreSQL database (local Postgres, or a hosted one such as Supabase/Neon/Railway)
- A Cloudinary account (media uploads are required — `apps/api` fails to boot without valid Cloudinary env vars)
- (Optional) SMTP credentials, if you want contact-form email notifications to actually send

## Local setup

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Configure environment variables (see next section)
cp apps/api/.env.example apps/api/.env
# apps/web/.env.local and apps/admin/.env.local also need to exist — see below

# 3. Point DATABASE_URL/DIRECT_URL at a real Postgres instance, then push the schema
pnpm db:push          # or: pnpm db:migrate (creates a tracked migration)
pnpm db:generate       # regenerates the Prisma client into packages/database/generated

# 4. Seed roles/permissions + reference content (technologies, etc.)
pnpm db:seed

# 5. Bootstrap a real admin login (see "Authentication & RBAC" — the seed only
#    creates a placeholder User row with no password)

# 6. Run everything (web:3000, admin:3001, api:4000) via Turborepo
pnpm dev

# ...or run a single app:
pnpm dev:web
pnpm dev:admin
pnpm dev:api
```

Once running:
- Web: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:4000 (health check: `GET /health`)
- Prisma Studio (DB browser): `pnpm db:studio`

## Environment variables

### `apps/api/.env` (see `apps/api/.env.example`, validated at boot by `apps/api/src/env.ts` — the process throws on startup if any required var is missing/invalid)

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | no (default `development`) | `development` \| `test` \| `production` |
| `PORT` | no (default `4000`) | API listen port |
| `DATABASE_URL` | **yes** | Postgres connection string |
| `DIRECT_URL` | only for migrations | Needed when `DATABASE_URL` goes through a pooler (e.g. Supabase PgBouncer) — Prisma migrations need a direct, non-pooled connection |
| `BETTER_AUTH_SECRET` | **yes** (min 16 chars) | Random secret used to sign session tokens |
| `BETTER_AUTH_URL` | **yes** (must be a valid URL) | Public base URL of the API (auth is mounted at `<this>/api/v1/auth`) |
| `AUTH_TRUSTED_ORIGINS` | required in production | Comma-separated list of origins allowed to make credentialed requests (CORS) — e.g. `https://mabdigitalservice.vercel.app,https://admin-mabdigitalservice.vercel.app`. Boot **fails** in production if empty. |
| `AUTH_COOKIE_DOMAIN` | no | Set to the apex domain (e.g. `.calibre.digital`) so `web` and `admin` share one session cookie. Leave blank for local dev. |
| `CLOUDINARY_CLOUD_NAME` | **yes** | |
| `CLOUDINARY_API_KEY` | **yes** | |
| `CLOUDINARY_API_SECRET` | **yes** | |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | no | If left blank, contact-form notification emails are silently skipped (logged, not fatal) |
| `ADMIN_NOTIFICATION_EMAIL` | no | Recipient for contact-form alerts; falls back to the `contact_email` site setting configured in the admin panel |

### `apps/web/.env.local`

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the API, e.g. `http://localhost:4000` locally or `https://api-mabdigitalservice.vercel.app` in production |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the web app itself (used for canonical/SEO tags) |

### `apps/admin/.env.local`

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the API — the admin panel talks to the same API as the web app |

## Available scripts

Run from the repo root (delegate to Turborepo, which fans out to every workspace package):

| Script | Description |
|---|---|
| `pnpm dev` | Run `web` + `admin` + `api` + all watched packages concurrently |
| `pnpm dev:web` / `dev:admin` / `dev:api` | Run a single app only (`turbo run dev --filter=<app>`) |
| `pnpm build` | Build every app/package (`next build` for web/admin, `tsc --noEmit` for api — see [Known gotchas](#known-gotchas)) |
| `pnpm lint` | ESLint across every workspace |
| `pnpm typecheck` | `tsc --noEmit` across every workspace |
| `pnpm test` | Runs `turbo run test` (no test suites exist in this repo yet — the pipeline is wired but unused) |
| `pnpm format` | Prettier, whole repo |
| `pnpm clean` | Clean build artifacts + remove all `node_modules` |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:migrate` | Create/apply a dev migration (`prisma migrate dev`) |
| `pnpm db:push` | Push the schema without creating a migration file (fast local iteration) |
| `pnpm db:seed` | Seed RBAC roles/permissions + reference content |
| `pnpm db:studio` | Open Prisma Studio |

## Database & data model

PostgreSQL, managed by Prisma (`packages/database/prisma/schema.prisma`). Model groups:

- **Auth/RBAC**: `User`, `Session`, `Account`, `Verification` (Better Auth's Prisma adapter shape) + `Role` / `Permission` / `RolePermission` (a custom granular RBAC layer — a user has one `Role`, a role has many `Permission`s, each permission is a `resource:action` pair like `services:create`).
- **Shared building blocks**: `Media` (Cloudinary asset registry — single source of truth for every image/video used anywhere), `SeoMeta` / `PageSeo` (per-entity vs. per-route SEO), `Technology`, `Testimonial`, `Faq`.
- **Services**: `ServiceCategory`, `Service`, `PricingPlan`.
- **Portfolio**: `ProjectCategory`, `Project`, `ProjectImage`.
- **About/Team**: `TeamMember`, `Skill`, `CoreValue`, `TimelineEvent`, `Certification`.
- **Affiliate tools**: `AffiliateCategory`, `AffiliateTool`.
- **Leads**: `ContactSubmission`.
- **Site config**: `NavItem`, `SiteSetting` (generic key/value store — socials, currency, branding, Google Maps embed, etc.), `HomePageContent`, `HomeStat`, `HomeProcessStep`, `HomeWhyReason`, `AboutPageContent` (singleton content rows for the Home/About pages).
- **Finance** (the admin panel's invoicing system): `Client`, `Quotation` + `QuotationItem`, `Invoice` + `InvoiceItem`, `Payment`, `FinanceSettings` (numbering sequences/prefixes, default currency, banking details, tax rate).

Almost every content model follows the same conventions: `cuid` ids, `createdAt`/`updatedAt`, a `ContentStatus` enum (`DRAFT`/`PUBLISHED`/`ARCHIVED`) + `order: Int` on anything manageable/orderable from the admin panel, a unique `slug` on anything with its own public URL, and an optional 1:1 `SeoMeta` relation on anything that renders its own page.

## Authentication & RBAC

- Auth is handled entirely by **Better Auth** (`packages/auth`), mounted at `ALL /api/v1/auth/*` in the API (`apps/api/src/index.ts`) — email/password only, 7-day sessions (refreshed once/day). The `admin` app's `authClient` (`apps/admin/src/lib/auth-client.ts`) talks to this endpoint.
- **Session cookie & cross-domain deployments**: `packages/auth/src/server.ts` supports `AUTH_COOKIE_DOMAIN` (`crossSubDomainCookies`) for the case where `web`/`admin`/`api` are real subdomains of one apex domain you own (e.g. `admin.yoursite.com` + `api.yoursite.com`) — set it to `.yoursite.com` and the session cookie is shared automatically. **This repo is currently deployed without a custom domain** (`admin-mabdigitalservice.vercel.app` and `api-mabdigitalservice.vercel.app` are unrelated `*.vercel.app` project domains — `vercel.app` is a public suffix, so no cookie can be scoped across them at all, `AUTH_COOKIE_DOMAIN` or not). To make login work under that constraint, `apps/admin` instead **proxies all API traffic through its own origin**:
  - `apps/admin/next.config.ts` rewrites `/api/v1/:path*` to the real API (`NEXT_PUBLIC_API_URL`) — Next.js forwards the request/response (including `Set-Cookie`) transparently, so from the browser's point of view every call is same-origin.
  - `apps/admin/src/lib/auth-client.ts` and `apps/admin/src/lib/api.ts` call **relative** paths (no `NEXT_PUBLIC_API_URL` prefix client-side) so requests actually go through that proxy instead of straight to the API's own domain.
  - `apps/admin/src/middleware.ts` (which gates every admin page via `getSessionCookie`) excludes `/api` from its matcher, so proxied auth calls aren't redirected to `/login` before they ever reach the rewrite.
  - Net effect: the session cookie is set on `admin-mabdigitalservice.vercel.app` itself, which the middleware can read. If you later move to a real custom domain, switch back to `AUTH_COOKIE_DOMAIN` + direct cross-origin calls (simpler, one less proxy hop) — the same-origin proxy is a workaround for not having an apex domain yet, not the long-term-preferred setup.
- **RBAC**: every authenticated request that hits a protected route goes through `requireAuth` (`apps/api/src/middleware/require-auth.ts`), which resolves the Better Auth session, loads the `User` row with its `role.permissions`, and rejects banned/roleless-but-nonexistent users. `requirePermission(resource, action)` then checks the flattened `"resource:action"` permission set. Permissions are seeded (see `packages/database/prisma/seed.ts`): a **Super Admin** role gets every `resource:action` pair across ~25 resources × 4 actions (`view`/`create`/`update`/`delete`), and an **Editor** role gets everything except `users`/`roles`/`permissions`/`settings`.
- **Bootstrapping the first login** — the seed script creates a *placeholder* `User` row (`admin@calibre.digital`) with the Super Admin role but **no password**, because Better Auth requires a real sign-up flow to create the linked `Account`/credential row, and there's no sign-up UI in the admin app (`apps/admin/src/app/login/page.tsx` is sign-in only, by design — this isn't a self-service product). To get a working login:
  1. Call the Better Auth sign-up endpoint directly, e.g.:
     ```bash
     curl -X POST http://localhost:4000/api/v1/auth/sign-up/email \
       -H "Content-Type: application/json" \
       -d '{"name":"Admin","email":"you@example.com","password":"a-strong-password"}'
     ```
  2. Open Prisma Studio (`pnpm db:studio`), find the new `User` row, and set its `roleId` to the Super Admin role's `id` (find it in the `roles` table, `slug = "super-admin"`).
  3. Sign in at `/login` on the admin app with that email/password.

## API reference

Base path for everything below: **`/api/v1`** (e.g. `GET /api/v1/services`). Also: `GET /health` → `{ status: "ok" }` (no prefix).

**Cross-cutting behavior**
- **CORS**: only origins listed in `AUTH_TRUSTED_ORIGINS` are allowed, with `credentials: true`. In production, boot fails if this is unset (fails closed, never falls back to reflecting any origin).
- **Rate limiting**: 120 requests/min per IP globally; the public contact form (`POST /api/v1/contact`) has an additional, tighter limiter of 5 requests per 15 minutes per IP.
- **Body limit**: JSON bodies capped at 1MB.
- **Error shape**: validation errors (`zod`) → `422 { error, issues }`; not-found Prisma record → `404 { error: "Record not found" }`; unique-constraint conflicts → `409`; FK-constraint (still referenced) → `409`; DB unreachable → `503`; unmatched route → `404 { error: "Not found", path }`; anything else → `500 { error: "Internal server error" }`.
- **Auth middleware**: `requireAuth` validates the Better Auth session and loads the caller's permission set; `requirePermission(resource, action)` (and `requireAnyPermission`) gate individual routes — see [Authentication & RBAC](#authentication--rbac).

### Standard CRUD resources

The following resources are all generated by one shared factory (`apps/api/src/lib/create-crud-router.ts`) and always expose the same 6 routes for a given `<prefix>`:

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/<prefix>/` | public | List (status/enabled-filtered where applicable), ordered |
| `GET` | `/<prefix>/admin` | `<resource>:view` | Paginated/searchable/sortable/filterable admin listing |
| `GET` | `/<prefix>/:id` | public | Single item by id |
| `POST` | `/<prefix>/` | `<resource>:create` | Create |
| `PATCH` | `/<prefix>/:id` | `<resource>:update` | Partial update |
| `DELETE` | `/<prefix>/:id` | `<resource>:delete` | Delete → `204` |

| Prefix | Permission resource | Model | Public filter | Search fields |
|---|---|---|---|---|
| `/faqs` | `faqs` | `Faq` | `status: PUBLISHED` | question, answer |
| `/navigation` | `navigation` | `NavItem` | none | — |
| `/home-stats` | `home` | `HomeStat` | `isEnabled: true` | title |
| `/home-process-steps` | `home` | `HomeProcessStep` | `isEnabled: true` | title |
| `/home-why-reasons` | `home` | `HomeWhyReason` | `isEnabled: true` | title |
| `/skills` | `team` | `Skill` | `isEnabled: true` | name |
| `/core-values` | `about` | `CoreValue` | none | — |
| `/timeline-events` | `about` | `TimelineEvent` | none | — |
| `/certifications` | `about` | `Certification` | none | — |

### Custom / hand-written routers

#### Services — `/api/v1/services`
- `GET /` — public, `PUBLISHED` only, includes category/hero media/pricing plans (currency resolved per-plan, falling back to the site-wide currency setting).
- `GET /admin` — `services:view`, paginated/search/sort/filter (`status`, `categoryId`, `isFeatured`).
- `GET /:slug` — public single service (category, hero media, SEO, technologies, pricing plans, FAQs, testimonials, related services).
- `POST /` — `services:create`. Creates the `SeoMeta` row first, then the service, connecting technologies/FAQs/related services and creating nested pricing plans. Validates each pricing plan (`regularPrice` required unless `isCustomQuote`; `discountPrice` must be less than `regularPrice`).
- `PATCH /:id` — `services:update`. Same pricing-plan validation; `pricingPlans` array (if sent) is fully replaced (delete-all + recreate), not diffed.
- `DELETE /:id` — `services:delete` → `204`.

#### Portfolio (Projects) — `/api/v1/projects`
- `GET /` — public, paginated (`page`, `pageSize`, `category`, `search`), `PUBLISHED` only.
- `GET /admin` — `projects:view`, paginated/search/sort/filter.
- `POST /media/sign` — `projects:create` **or** `projects:update`. Returns a signed Cloudinary upload payload scoped to `agency-website/projects` (lets the project form upload images/video directly to Cloudinary).
- `GET /:slug` — public single project (category, tech stack, ordered gallery, published testimonials, SEO, related projects).
- `POST /` — `projects:create`. Creates `SeoMeta` first, then the project with nested gallery images.
- `PATCH /:id` — `projects:update`. If `videoPublicId` changes, the old Cloudinary video asset is destroyed. If `gallery` is sent, dropped images are destroyed on Cloudinary before the DB rows are replaced.
- `DELETE /:id` — `projects:delete`. Deletes the DB row, then best-effort destroys every associated Cloudinary asset (gallery + video). `204`.

#### Testimonials — `/api/v1/testimonials`
Custom (nested `projects` M2M): `GET /`, `GET /admin` (`testimonials:view`), `GET /:id`, `POST /` (`testimonials:create`), `PATCH /:id` (`testimonials:update`), `DELETE /:id` (`testimonials:delete`).

#### Team — `/api/v1/team`
Custom (nested `skills` M2M + JSON `socials`): `GET /`, `GET /admin` (`team:view`), `GET /:id`, `POST /` (`team:create`), `PATCH /:id` (`team:update` — partial `socials` updates never wipe existing links unless the key is explicitly present), `DELETE /:id` (`team:delete`).

#### Affiliate — `/api/v1/affiliate`
Two sub-resources under one router, permission resource `affiliate`:
- **Categories**: `GET /affiliate/categories`, `GET /affiliate/categories/admin`, `POST /affiliate/categories`, `PATCH /affiliate/categories/:id`, `DELETE /affiliate/categories/:id`.
- **Tools**: `GET /affiliate/tools` (public, filterable by `category`/`featured`/`search`, paginated), `GET /affiliate/tools/admin`, `POST /affiliate/tools`, `PATCH /affiliate/tools/:id`, `DELETE /affiliate/tools/:id`.

#### Contact — `/api/v1/contact`
- `POST /` — **public**, extra rate limit of **5 requests / 15 min / IP**. Creates a `ContactSubmission`, then fires a best-effort SMTP notification email (never blocks or fails the request).
- `GET /` — `settings:view`, paginated/search/sort/filter (`status`, `country`).
- `PATCH /:id` — `settings:update`, body `{ status }`.
- `POST /bulk-delete` — `settings:delete`, body `{ ids: string[] }` → `{ count }`.
- `DELETE /:id` — `settings:delete` → `204`.

#### Settings — `/api/v1/settings`
Key-value store (`SiteSetting`). `GET /` (public) → `{ settings: { [key]: value } }`. `PUT /:key` (`settings:update`) — known keys (`socials`, `currency`, `branding`, `google_maps_embed`, `google_maps_embed_code`) are validated/transformed; unknown keys are stored as-is.

#### Media — `/api/v1/media`
- `POST /sign` — `media:create`. Returns a signed Cloudinary upload payload for a given folder.
- `POST /` — `media:create`. Registers a Cloudinary asset (already uploaded client-side) in the `Media` table.
- `DELETE /:id` — `media:delete`. Best-effort destroys the Cloudinary asset, then deletes the DB row.

#### Categories — `/api/v1/categories`
Three near-identical sub-resources (permission resource `categories`), writes are whitelisted-field passthrough rather than full zod validation:
- `/categories/services`, `/categories/projects`, `/categories/technologies` — each with `GET /`, `GET /admin`, `POST /`, `PATCH /:id`, `DELETE /:id`.

#### Page SEO — `/api/v1/page-seo`
`GET /:page` (public, `page` must be a known key) and `PUT /:page` (`seo:update`) — upsert semantics keyed by page name, not id.

#### Pages (Home/About singleton content) — `/api/v1/pages`
- `GET /home`, `PUT /home` (`home:update`) — singleton `HomePageContent` (hero copy/CTAs, contact CTA block), with SEO handled as a separate `seoId` FK.
- `GET /about`, `PUT /about` (`home:update`) — singleton `AboutPageContent` (story/mission/vision/philosophy).
- `GET /about/team` — public aggregation: published team members + core values + timeline + certifications in one call.

#### Roles / Permissions / Users — `/api/v1/roles`, `/api/v1/permissions`, `/api/v1/users`
- **Roles**: `GET /` (`roles:view`), `POST /` (`roles:create`), `PATCH /:id` (`roles:update` — full permission-set replace if `permissionIds` sent), `DELETE /:id` (`roles:delete` — blocked for system roles, `400`).
- **Permissions**: `GET /` (`permissions:view`) — read-only, seeded not admin-managed.
- **Users**: `GET /me` (any authenticated user — returns the caller's own effective permission set), `GET /` (`users:view`), `PATCH /:id` (`users:update` — body `{ roleId, banned }`).

#### Finance — `/api/v1/finance/*`
The admin panel's quotation/invoice/payment system. All routes require auth (including reads — this is PII/financial data).

- **Clients** (`/finance/clients`): `GET /admin` (`clients:view`, paginated), `GET /` (flat list for pickers), `GET /:id`, `GET /:id/summary` (revenue/pending/overdue aggregation + recent payments), `POST /` (`clients:create`), `PATCH /:id` (`clients:update`), `DELETE /:id` (`clients:delete`).
- **Quotations** (`/finance/quotations`): `GET /admin`, `GET /:id`, `POST /` (`quotations:create` — totals always computed server-side, never trusted from the client; auto-generates `quoteNumber`), `PATCH /:id` (`quotations:update` — full item-list replace inside a transaction), `PATCH /:id/archive`, `POST /:id/duplicate` (`quotations:create`), `POST /:id/convert-to-invoice` (`invoices:create` — atomically creates the invoice and flips the quote to `ACCEPTED`), `DELETE /:id` (`quotations:delete`).
- **Invoices** (`/finance/invoices`): `GET /admin`, `GET /:id`, `POST /` (`invoices:create`), `PATCH /:id` (`invoices:update` — recomputes `balance` against existing payments so editing line items after a partial payment stays correct), `PATCH /:id/status` (manual status override), `POST /:id/duplicate` (`invoices:create`), `DELETE /:id` (`invoices:delete`).
- **Payments** (`/finance/payments`): `GET /admin`, `GET /:id`, `POST /` (`payments:create` — rejects if `amount` exceeds the invoice's remaining balance, then recomputes the invoice's `amountPaid`/`balance`/`status`), `PATCH /:id` (`payments:update`), `DELETE /:id` (`payments:delete`) — every write recomputes the affected invoice(s)' balance atomically.
- **Finance Settings** (`/finance/settings`): `GET /` (`financeSettings:view` — auto-creates a default row if none exists), `PUT /` (`financeSettings:update` — quote/invoice numbering prefixes/formats/sequences, default currency, banking details, tax rate).
- **Finance Dashboard** (`/finance/dashboard`): `GET /` (`invoices:view` — top-level KPIs: revenue, pending, outstanding, invoice/quote counts, average invoice value), `GET /charts` (revenue trend, outstanding trend, revenue by project/client top-8, invoice status distribution, payment method distribution, quote→invoice conversion rate — filterable by date range preset).
- **Finance Projects** (`/finance/projects`): `GET /:id/summary` (`invoices:view` — per-project quoted/invoiced/received/outstanding totals).
- **Finance Reports** (`/finance/reports`): `GET /summary` (aggregate KPIs over filters), `GET /export` (unfiltered-pagination CSV/Excel-style export, capped at 5000 rows, backed by a raw-SQL `UNION ALL` across quotations/invoices/payments), `GET /:type/:id` (drill-down detail, `:type` ∈ `quotation`/`invoice`/`payment`), `GET /` (paginated unified list with the full filter set: client, project, status, method, currency, date range, search, sort).

## Deployment guide (Vercel)

This project is deployed as **three independent Vercel projects** from the same GitHub repo — one per app, each with its **Root Directory** set to that app's folder. There is no `vercel.json`; Vercel auto-detects the framework per project (confirmed live configuration):

| App | Vercel project | Root Directory | Framework preset | Production domain |
|---|---|---|---|---|
| `apps/web` | `mabdigitalservice` | `apps/web` | Next.js | `mabdigitalservice.vercel.app` |
| `apps/admin` | `admin-mabdigitalservice` | `apps/admin` | Next.js | `admin-mabdigitalservice.vercel.app` |
| `apps/api` | `api-mabdigitalservice` | `apps/api` | Express | `api-mabdigitalservice.vercel.app` |

All three run on **Node 24.x**.

### Steps to deploy from scratch

1. **Provision Postgres.** Use a hosted provider (Supabase, Neon, Railway, etc.). Grab both a pooled connection string (`DATABASE_URL`) and a direct one (`DIRECT_URL`) if the provider fronts connections with a pooler (e.g. Supabase's PgBouncer).
2. **Push the schema and seed once**, from your machine, pointed at the production database:
   ```bash
   DATABASE_URL="..." DIRECT_URL="..." pnpm db:push
   DATABASE_URL="..." DIRECT_URL="..." pnpm db:seed
   ```
   Then bootstrap a real admin login against the deployed API (see [Authentication & RBAC](#authentication--rbac)).
3. **Create three Vercel projects**, each pointing at this repo with the Root Directory set per the table above. Because it's a pnpm workspace, Vercel installs from the repo root (workspace-aware) and builds only the selected app.
4. **Set environment variables per project** (Vercel dashboard → Project → Settings → Environment Variables):
   - **`api-mabdigitalservice`**: every variable listed in [Environment variables → apps/api](#environment-variables) (`DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` = the API's own production URL, `AUTH_TRUSTED_ORIGINS` = comma-separated web + admin production URLs, `AUTH_COOKIE_DOMAIN` if using a shared apex domain, Cloudinary creds, optionally SMTP creds).
   - **`mabdigitalservice`** (web): `NEXT_PUBLIC_API_URL` = the API's production URL, `NEXT_PUBLIC_SITE_URL` = the web app's own production URL.
   - **`admin-mabdigitalservice`**: `NEXT_PUBLIC_API_URL` = the API's production URL.
5. **Deploy the API first**, then web/admin (they read `NEXT_PUBLIC_API_URL` at build time for Next.js's static/edge optimizations, so the API URL should be stable before building the frontends).
6. **Verify CORS**: `AUTH_TRUSTED_ORIGINS` on the API must list the exact production origins of both `web` and `admin` — the API refuses to boot in production if this is empty, and credentialed requests from an unlisted origin will fail CORS.
7. Every subsequent push to `main` auto-redeploys all three projects (standard Vercel Git integration) — no manual step needed beyond the initial schema push/seed and any later `db:migrate`/`db:push` for schema changes.

## Known gotchas

Pulled from this repo's own deploy history — worth knowing before touching `apps/api` or its workspace dependencies:

- **`apps/api`'s `build` script is `tsc --noEmit`** (a typecheck, not a real emit) — Vercel's Express preset runs the TypeScript entrypoint directly via its own build step, but every workspace package it depends on (`@agency/database`, `@agency/auth`, `@agency/types`, `@agency/utils`) **must have real compiled `dist/` output**, or the deployed function fails at runtime with module-resolution errors — this bit a prior deploy (`9b56154`).
- **`helmet`** ships CJS-only types that Vercel's separate serverless type-check pass can't resolve as a callable import; it's loaded via `createRequire(...)("helmet")` in `apps/api/src/index.ts` instead of a normal `import`, specifically to route around that checker.
- **`express-rate-limit`** must be imported as a **named** import (`{ rateLimit }`), not a default import, or the Vercel build fails (`8aa6361`).
- Several Prisma `create()`/`update()` payloads (`pricingPlans`, `computeDocumentTotals`, `page-seo` upsert) had to be given **explicit types** rather than relying on Zod-inferred generics — Vercel's TypeScript version/inference behaves stricter than local `tsc` in a few spots. If a local build passes but a Vercel deploy fails on a type error inside a Prisma call, suspect this class of issue first.
