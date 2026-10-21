# Automation & Hardening Plan

Companion to `MULTI_OWNER_PLAN.md`. Goal: sell the site to other hosts with as
little manual work on our side as possible, without adding security risk.

Positioning: the direct-booking and automation layer that sits beside whatever
the owner already uses (Airbnb, VRBO, a PMS). We do not build a channel
manager — Airbnb's API is partner-only, and Hostaway/OwnerRez already own that.

## Order of attack

Each stage ships on its own branch and must pass CI (typecheck, lint, unit
tests) before it merges, because one push redeploys every owner.

### Stage 1 — Security bundle (blocker for the first paid owner)
1. **Durable rate limiting.** The limiter was an in-memory map, so on Vercel
   each instance had its own counts. Counts now live in Postgres (`RateLimit`
   table, one atomic upsert per check). Login is limited per IP *and* per
   email. Public checkout and subscribe are limited per IP.
2. **Admin audit log.** `AdminAuditLog` records who did what (logins, booking
   changes, refunds, prices, users, Stripe, feeds). Viewable in Settings →
   Security. Writes never block or fail the action they record.
3. **Two-factor login.** Authenticator-app codes (TOTP, RFC 6238), secrets
   encrypted at rest, one-time recovery codes, replay protection. A
   `sessionVersion` on each admin revokes old sessions when 2FA or the
   password changes. `ADMIN_REQUIRE_2FA=true` forces it on every admin.
4. **Test gate.** Vitest unit tests and a GitHub Actions workflow running
   typecheck, lint and tests on every push and PR.

Done when: all four are merged, migrations applied, and 2FA is on for every
admin account.

### Stage 2 — Remove our per-owner work
5. **Property config in the database + onboarding wizard.** The code file
   becomes the default only; owners enter name, contact, photos, rooms,
   policies and permits themselves.
6. **Launch gate.** Online checkout turns on only once STR permit, TOT
   certificate, tax rates and a charge-ready Stripe account are present.
7. **Provisioning + fleet script.** One command: Neon DB → migrate → Vercel
   project → env vars → domain → seed → admin invite. Plus `fleet migrate`
   and `fleet health` across every owner.
8. **Owner billing.** Stripe Billing on the platform account (setup fee +
   monthly), customer portal, and checkout paused after failed-payment
   retries run out.

### Stage 3 — Reliability
9. **Sync every 15 minutes** from a free external scheduler (GitHub Actions
   or Upstash QStash) calling the cron routes with `CRON_SECRET`, plus an
   email to the owner when a channel booking overlaps a direct one.
10. **Monitoring.** Error tracking, and an alert to us when a cron or the
    Stripe webhook fails on any owner's site.

### Stage 4 — What owners pay for
11. Guest message sequence: pre-arrival (door code 48h before), check-in,
    checkout reminder.
12. Cleaner notifications on every booking/cancellation + private cleaning
    calendar feed.
13. Abandoned-checkout recovery email (one, opt-out respected).
14. Monthly owner report and quarterly TOT filing pack, emailed.

### Stage 5 — Later
15. Built-in pricing rules (gap nights, last-minute, occupancy), optional
    PriceLabs connection.
16. AI-drafted guest replies — draft only, owner approves, no payment data.
17. Shared multi-tenant app (MULTI_OWNER_PLAN Phase 2) at 15+ owners.

## Security rules for every automation
- Nothing automated sends money or refunds without an admin action.
- Secrets only in env vars; nothing sensitive in URLs, logs or the audit log.
- Every scheduled route checks `CRON_SECRET`; every admin route calls
  `requireAdmin` and records mutations in the audit log.
- AI features draft, never send.
