# Multi-Owner Plan

Turn the Whistle Inn site into a product other short-term rental owners can buy:
their own branded site with direct booking, priced as setup + monthly.

## Recommendation: one codebase, one deployment per owner (for now)

| | Deployment per owner (Phase 1) | Shared multi-tenant app (Phase 2) |
|---|---|---|
| Code | One repo; every Vercel project builds from `main` | One repo, one deployment |
| Data | Separate Neon database per owner | One database, `propertyId` on every table |
| Risk of one owner seeing another's data | None — databases are separate | Every query must filter by property |
| Work to get there | Small: pull out hardcoded Whistle Inn details | Large: touches all ~60 API routes |
| Bug fixes | One push redeploys every owner | One push |
| Right size | 1–15 owners | 15+ owners |

Phase 1 gets pilots live in weeks without risking a data leak. Move to Phase 2
only once the per-owner overhead (DB migrations, env vars, cron jobs) hurts.

Never fork the repo per owner — that is what makes fixes 10x the work.

## What is single-property today

- **Branding hardcoded in 28 files** — "Whistle Inn", "Nora", `thewhistleinn.com`
  fallbacks in emails, the cancel page, webhook, approve route, layout, sitemap.
- **Room copy and photos live in code** (`src/lib/rooms.ts`), split from price
  and capacity in the `Room` table.
- **Contact defaults** in `src/lib/checkout-settings.ts` (Nora, 530 number).
- **Policies in code**: `MINIMUM_NIGHTS = 3` in the checkout route (also a
  separate default in `settings/public`), cancellation tiers in
  `src/lib/cancellationPolicy.ts`.
- **`vercel.json`** redirects admin to `thewhistleinn.com`.
- **Stripe** uses one secret key for everything — no Connect.
- **No occupancy tax.** The booking modal says "Includes taxes & fees" but no
  tax is calculated. This affects the Whistle Inn today, not just new owners.
- **No booking-source tracking**, so ad-driven bookings can't be credited.

## Phase 1 — pilot-ready (in order)

### 1. Property settings instead of hardcoded details — done (name, contact, address)
- Each owner is a file in `src/config/properties/` (name, host, email, phone,
  address, check-in/out, bedrooms, amenities, SEO copy), registered in
  `src/config/property.ts` and picked by `NEXT_PUBLIC_PROPERTY_ID`.
- Pages, emails, Stripe line items, the iCal feed and the admin header read it;
  no code outside `src/config/` names a property.
- To add an owner: copy `whistle-inn.ts`, fill it in, register it, and set
  `NEXT_PUBLIC_PROPERTY_ID` and `NEXT_PUBLIC_BASE_URL` on their Vercel project.
- Still per-property in code: photos (`HeroImageSlider`, gallery, `/public`),
  room list and copy (`src/lib/rooms.ts`), cancellation tiers
  (`src/lib/cancellationPolicy.ts`), minimum nights in the checkout route, and
  the `vercel.json` admin redirect to `thewhistleinn.com`. Homepage copy is
  already editable from the admin panel.

### 2. Occupancy tax — done (`feat/occupancy-tax`)
- `TaxSetting` fields: TOT rate, tourism-assessment rate, whether cleaning
  fees are taxed, jurisdiction (zone), TOT certificate number.
- `calculateQuote` returns tax lines; checkout sends them as Stripe tax rates
  so they show separately on the receipt.
- Stays of 30+ nights skip both taxes automatically.
- Store the tax amounts on each `Booking`.
- Admin report: taxable rent, exempt stays, TOT and assessment collected, per
  month and quarter.
- Placer County zone presets (owner confirms or edits):
  - East Placer / North Lake Tahoe unincorporated: 10% TOT + NLTTBID assessment
  - West Placer unincorporated, Auburn, Loomis: 8%
  - Rocklin, Roseville, Colfax, Lincoln: 10%

### 3. Stripe Connect
- Your account is the platform; each owner connects their own Stripe account
  (Standard or Express) during onboarding.
- Checkout sessions are created on the owner's account (direct charges), so
  guest money, refunds and chargebacks are theirs.
- `application_fee_amount` set only on ad-attributed bookings (step 4).
- Webhook switches to a Connect webhook.

### 4. Booking-source tracking
- `Booking.source` (direct, ad_google, ad_meta, coupon, repeat) plus UTM fields.
- 30-day attribution cookie set from tracked ad links; ad-only coupon codes as
  a backup.
- Owner dashboard shows bookings and revenue by source — this is the proof for
  the performance fee.

### 5. Built-in marketing (included in base price)
- Repeat-guest email after checkout with a return-stay coupon (cron + Resend,
  reusing `EmailTemplate`).
- Review-request email.
- Per-property SEO: structured data (`LodgingBusiness`), titles, sitemap from
  settings.
- "Book direct" printable card with a coupon code.

### 6. Launch gate (onboarding checklist)
- Online checkout stays off (existing `online_checkout_enabled` flag) until
  the owner has entered: STR permit, TOT certificate, business license, tax
  rates, and a connected Stripe account.
- Permit number shown in the footer and on the booking page.

### 7. Provisioning script
`scripts/provision-owner.js`: create the Neon database → run
`prisma migrate deploy` → create the Vercel project from this repo → set env
vars → attach the custom domain → seed settings → create the owner's admin login.
Target: a new owner live in under an hour of your time.

### 8. Billing owners
- Stripe Billing on your platform account: setup fee (one-time) + monthly
  subscription per property. Optional Growth retainer as a second price.

## Phase 2 — shared multi-tenant (later, 15+ owners)
- `Property` table; `propertyId` on every model; middleware resolves the
  property from the request hostname.
- One Prisma helper that always scopes queries by property, plus tests that try
  to read across properties.
- Merge the per-owner databases with a migration script.

## Business and legal (before the first paid pilot)
- LLC; a lawyer reviews the service agreement once (uptime, who owns the domain
  and data, what happens when an owner leaves, owner is responsible for paying
  taxes).
- Ask the lawyer whether per-booking ad fees need a real-estate license in
  California; the flat retainer is the fallback.
- Placer County caps STR permits at 3,900 — confirm each prospect already has one.
