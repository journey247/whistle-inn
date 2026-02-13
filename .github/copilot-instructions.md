# Copilot Instructions — Whistle Inn Website

## Quick summary ✅
- Next.js 14 (app router) vacation rental site. Server components for init (`src/app/layout.tsx`).
- Data: Prisma + Neon Postgres (`prisma/schema.prisma`). Key models: `Booking`, `ExternalBooking`, `ICalFeed`, `Subscriber`, `EmailTemplate`, `SmsLog`, `AdminUser`.
- Background sync: `node-cron` syncs iCal feeds every 30 mins (`src/lib/ical-sync-scheduler.ts`) — initialized via client component in layout.
- Payments: Stripe (`/api/checkout_sessions` → webhook at `/api/stripe/webhook`).
- Notifications: Email (Resend with template system) and SMS (Twilio, optional).

## What an agent should know to be productive 🧭
- **Run locally**: `npm install` → `npm run dev`. Use `npm run build` to verify builds.
- **Testing**: `npm run test:e2e` (Puppeteer admin login test).
- **Security Check**: Run `npm run security:audit` to validate missing env vars.
- **Stripe Setup**: Run `node scripts/verify-stripe-config.js` to verify Stripe keys. See `STRIPE_SETUP.md` for complete webhook setup.
- **Admin Setup**: Run `npm run create-admin` (interactive) or `node scripts/create_admin.js` to bootstrap the first `AdminUser`.
- **DB Schema**: After changing `prisma/schema.prisma`, run `npx prisma migrate dev` and `npx prisma generate`.

## Architecture & conventions 💡
- **Booking Flow**: `BookingModal` → POST `/api/checkout_sessions` → Stripe → Webhook (`/api/stripe/webhook`) → Database update → Email confirmation.
- **Availability**: GET `/api/availability` aggregates `Booking` (internal) and `ExternalBooking` (iCal synced).
- **Scheduler**: Initialized client-side via `<IcalSyncInitializer />` in `src/app/layout.tsx`. Admin API can manually trigger syncs (`POST /api/admin/ical-feeds/sync`) or check status (`.../scheduler`).
- **Admin Auth**: JWT-based. Protected routes use `verifyAdmin(request)` helper in `src/lib/adminAuth.ts`. Tokens issued on login, include `sub`, `email`, `role`.
- **Email System**: Template-based via `src/lib/email.ts`. Templates stored in `EmailTemplate` model with `{{ variable }}` syntax. Example: `booking_confirmation` template.
- **Dynamic Routes**: API routes often use `export const dynamic = 'force-dynamic'` for fresh data (especially admin APIs).
- **Security**: Middleware (`middleware.ts`) handles CSP, CORS, rate-limiting headers, admin page no-index, and webhook content-type exceptions.
- **Formatting**: `prettify` not enforced in CI but follow existing style (4 indent, clear variable names).

## Useful Endpoints (Admin) 🔧
- **Analytics**: `GET /api/admin/analytics` (Basic stats: revenue, occupancy).
- **Feeds**: `GET/POST /api/admin/ical-feeds` (Manage sync sources).
- **SMS**: `POST /api/admin/notifications/sms` (Send manual text; requires Twilio vars).
- **Email Logs**: `GET /api/admin/email-logs`.
- **Sync Control**: `POST /api/admin/ical-feeds/scheduler` (Start/Stop).

## Environment & Secrets (in `.env.local`) 🔑
Critical variables (validate with `npm run security:audit`):
- `DATABASE_URL` (Neon)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`, `NEXT_PUBLIC_RESEND_FROM_EMAIL`
- `NEXTAUTH_SECRET`, `SETUP_KEY` (for admin creation/auth)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (Optional, enables SMS)

## Guidelines for Changes ✅
- **DB Changes**: Always update schema, migrate (`npx prisma migrate dev`), and regenerate client (`npx prisma generate`).
- **Tests**: Run `npm run test:e2e` after touching auth or admin pages.
- **Admin Routes**: Protect with `verifyAdmin(request)` and use `export const dynamic = 'force-dynamic'`.
- **Imports**: Modifying `ical-parser`? Keep dynamic imports (`await import()`) to avoid build-time server-only dep issues.
- **New Env Vars**: Add to `scripts/security-setup.js` validation if required for functionality.
- **Email Templates**: Create via admin API or seed migrations. Test rendering with `src/lib/email.ts` helper that handles `{{ variable }}` substitution.
