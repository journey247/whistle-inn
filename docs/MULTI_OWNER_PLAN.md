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
- Also in the owner's config: hero and gallery photos, the room list and
  copy, default prices and minimum nights, and cancellation tiers. New owners'
  photos go in `/public/properties/<id>/`.
- Still Whistle-Inn-specific: the homepage section layout (trains, skiing,
  fishing) and the content seed in `api/admin/content/seed`; homepage copy is
  editable in the admin panel, but a different layout needs code.

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

### 3. Stripe Connect — done (direct charges, admin onboarding)
- Owner clicks Connect in Admin → Settings → Pricing → Payments; the account
  gets the full Stripe Dashboard, pays its own fees, Stripe carries losses.
- Checkouts go to the owner's account only once it can take charges; until
  then the site's own Stripe account is used, as before.
- Each booking records the account it was charged on; refunds use it.
- Owners who already have a Stripe account get a new one through onboarding;
  linking an existing account (OAuth) is not built.
- Still to do: `application_fee_amount` for ad-attributed bookings (step 4).

Original notes:
- Your account is the platform; each owner connects their own Stripe account
  (Standard or Express) during onboarding.
- Checkout sessions are created on the owner's account (direct charges), so
  guest money, refunds and chargebacks are theirs.
- `application_fee_amount` set only on ad-attributed bookings (step 4).
- Webhook switches to a Connect webhook.

### 4. Booking-source tracking — done (`feat/booking-source`)
- A tracked landing (gclid, or UTM tags) sets a 30-day `book_src` cookie;
  checkout stores `source` + UTM tags on the booking. fbclid alone is not an
  ad (Facebook adds it to organic links) — tag Meta ads `utm_medium=paid`.
- `PLATFORM_AD_FEE_PERCENT` on an owner's site takes that % of pre-tax rent on
  paid-ad bookings as a Stripe application fee (connected accounts only).
  Refunds return the fee proportionally.
- Admin → Earnings shows paid revenue by source and ad fees paid.
- Not built: ad-only coupon codes as a backup attribution.

Original notes:
- `Booking.source` (direct, ad_google, ad_meta, coupon, repeat) plus UTM fields.
- 30-day attribution cookie set from tracked ad links; ad-only coupon codes as
  a backup.
- Owner dashboard shows bookings and revenue by source — this is the proof for
  the performance fee.

### 5. Built-in marketing (included in base price) — follow-up email done (`feat/guest-followups`)
- Day after checkout (daily cron, 17:00 UTC): thank-you, optional review
  link, and a single-use BACK-XXXXXXXX return-stay code (default 10%, 12
  months). Off until the owner enables it in Admin → Settings → Pricing.
- Carries the property address and an HMAC unsubscribe link; opt-outs live in
  `EmailOptOut` and are skipped. Only stays that ended in the last 7 days are
  emailed, so switching it on never reaches old guests.
- Not built yet: printable "book direct" card.

Original notes:
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
