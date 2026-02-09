# Copilot Instructions — Whistle Inn Website

## Quick summary ✅
- Next.js 14 (app router) site for a vacation rental. Server components are used for server-only initialization (see `src/app/layout.tsx`).
- Data is persisted with **Prisma** (Postgres / Neon). Key models: `Booking`, `ExternalBooking`, `ICalFeed`, `Subscriber` (`prisma/schema.prisma`).
- Background sync: `node-cron` runs an iCal sync every 30 minutes (`src/lib/ical-sync-scheduler.ts`), which imports the lightweight `parseIcalFeed` parser (`src/lib/ical-parser.ts`).
- Payments via **Stripe** (`/api/checkout_sessions`), emails via **Resend** (`/api/send-email`).
- Admin email templates (`EmailTemplate` model) and logs (`EmailLog`) are supported. See `src/app/api/admin/email-templates/*` and `src/app/api/admin/email-logs/route.ts`.

---

## What an agent should know to be productive (short checklist) 🧭
- Run locally: `npm install` → `npm run dev` (dev), `npm run build` (build; runs `prisma generate` first).
- DB: uses `DATABASE_URL` from `.env` (Neon by default). When changing schema run Prisma migrations and `prisma generate`.

**Creating the first admin user (one-time)**
- A one-time setup endpoint is available: `POST /api/admin/auth/create` with body `{ email, password, key }` where `key` must match `NEXT_PUBLIC_ADMIN_PASSWORD` (or `SETUP_KEY`). Use this to bootstrap the first `AdminUser`.

- Scheduler: started server-side by `IcalSyncInitializer` in `src/app/layout.tsx`. There are admin endpoints to control or trigger syncs (see examples below).
- Email templates & logs: templates are stored in `prisma/schema.prisma` as `EmailTemplate` and can be managed via `GET/POST /api/admin/email-templates` and deleted via `DELETE /api/admin/email-templates/[id]`. Sent messages are recorded in `EmailLog` and can be inspected via `GET /api/admin/email-logs`.
- API routes use `export const dynamic = 'force-dynamic'` when they should always query fresh DB state (look in `src/app/api/*`).

---

## Architecture & data flow (why things are structured this way) 💡
- Booking flow (frontend → backend):
  1. Client fetches availability from `/api/availability` (combines `booking` with `externalBooking`).
  2. Client posts to `/api/checkout_sessions` which creates a **pending** `Booking` and returns a Stripe Checkout session ID.
  3. Stripe redirects on success/cancel and the booking is confirmed via metadata/webhook or success handler.
- External platform sync: iCal feeds are parsed (basic DTSTART/DTEND/SUMMARY parsing) and saved to `externalBooking`. The scheduler deletes previous entries for a `source` and recreates them on each sync.

---

## Project-specific conventions & gotchas ⚠️
- Use `dynamic import(...)` for runtime-only modules that could cause build-time issues (see `parseIcalFeed` imports in sync code).
- The Prisma client uses a global singleton to avoid connection storms in development (`src/lib/prisma.ts`).
- Node cron is started in a server component (`IcalSyncInitializer`). Note: in serverless environments this may not persist — there are admin routes to run syncs manually if necessary.
- API handlers return `NextResponse.json(...)` and frequently set `export const dynamic = 'force-dynamic'` to ensure server-side data freshness.
- Date handling: `parseIcalFeed` outputs date-only strings (YYYY-MM-DD). Frontend `BookingModal` converts ranges to blocked individual dates.

---

## Files to reference (examples to copy patterns from) 📁
- Server initialization & scheduler: `src/app/layout.tsx`, `src/components/IcalSyncInitializer.tsx`, `src/lib/ical-sync-scheduler.ts`
- iCal parsing: `src/lib/ical-parser.ts`
- DB access pattern: `src/lib/prisma.ts` and `prisma/schema.prisma`
- Booking + availability + checkout: `src/app/api/availability/route.ts`, `src/app/api/checkout_sessions/route.ts`, `src/components/BookingModal.tsx`
- Admin APIs (feeds, external bookings, scheduler): `src/app/api/admin/ical-feeds/*`, `src/app/api/admin/external-bookings/route.ts`

---

## Useful example endpoints & payloads (ready to use) 🔧
- Start scheduler: POST /api/admin/ical-feeds/scheduler
- Scheduler status: GET /api/admin/ical-feeds/scheduler
- Run immediate sync: POST /api/admin/ical-feeds/sync
- List feeds: GET /api/admin/ical-feeds
- Add feed: POST /api/admin/ical-feeds  body: { name, url, source }
- Create external booking: POST /api/admin/external-bookings  body: { source, guestName, startDate, endDate, notes }

---

## Env & secrets (must be set to run key features) 🔑
- `DATABASE_URL` (required)
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (payments)
- `RESEND_API_KEY` (transactional email)
- `NEXT_PUBLIC_RESEND_FROM_EMAIL` (from address for transactional emails)
- `NEXT_PUBLIC_ADMIN_PASSWORD` (admin UX flag — currently public)
- Twilio is present in the code but disabled by default; store `TWILIO_*` secrets in your deployment provider only when re-enabling SMS.
- Add keys to `.env` and to your deployment provider (don’t commit secrets)

---

## Guidance for code changes or PRs (do this when editing the repo) ✅
- When changing the DB: update `prisma/schema.prisma`, create a migration, run `prisma generate`, and verify API routes that read/write the affected tables.
- Preserve the dynamic-import pattern for runtime-only modules and keep `dynamic = 'force-dynamic'` when an API must always read current DB state.
- For new background jobs: document how it’s started and how/where to schedule it in production (serverless caveat).
- Write small, focused commits with references to affected PR hashes and migration IDs (if DB changes).

---

If anything here is unclear or you want more detail (e.g., more example payloads, scheduler reliability guidance for Vercel vs. a long-running host), tell me which section to expand and I’ll iterate. 🔁
