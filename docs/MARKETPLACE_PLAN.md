# Marketplace Plan (hybrid model)

One public site (brand name TBD) where guests browse every owner's property
and book without leaving it, while each payment still goes straight into that
owner's own Stripe account and the platform's fee comes off automatically.

Builds on `MULTI_OWNER_PLAN.md` and `PROVISIONING.md`: owners keep their own
sites, databases and Stripe accounts. The marketplace adds a shared front door.

## Why hybrid

| | Directory only | Hybrid (this plan) | Full Airbnb-style |
|---|---|---|---|
| Guest books on | Owner's site | Marketplace | Marketplace |
| Money goes to | Owner | Owner (direct charge) | Platform, paid out later |
| Refunds, chargebacks | Owner | Owner | Platform |
| Platform holds funds | No | No | Yes (money-transmission risk) |
| Guest drop-off | High | Low | Low |

## Architecture: a thin front end over the owner sites

Each owner already runs a separate deployment and database. The marketplace
does **not** copy their data into a shared database. It reads each owner site's
public API and asks that site to create the checkout. The owner site stays the
only record of prices, availability, bookings and tax.

```
Guest ──> Marketplace (own Vercel project, small DB)
             │  listings, search, reviews, registry
             ├──> owner-a.com/api/settings/public, /rooms, /availability, /quote
             └──> owner-a.com/api/checkout_sessions  (signed, source=marketplace)
                        └──> Stripe Checkout on owner A's connected account
                             application_fee_amount = marketplace fee
Stripe success ──> back to the marketplace's confirmation page
```

- **Where it lives:** a `marketplace/` folder in this repo with its own Vercel
  project (Root Directory = `marketplace`). Contract changes to the owner API and
  the marketplace land in one PR.
- **No data merging:** works with Phase 1 (deployment per owner) today. If
  Phase 2 (shared multi-tenant) happens later, the marketplace can switch to
  direct DB reads without changing the guest experience.

## What the guest sees

1. **Home / search:** area, dates, guests. Map and photo cards.
2. **Results:** properties that are free on those dates, with total price
   including tax (from each owner's `/api/quote`).
3. **Property page:** photos, rooms, amenities, house rules, cancellation
   policy, STR permit number, reviews, availability calendar.
4. **Book:** guest details, then Stripe Checkout (the owner's account).
5. **Confirmation:** on the marketplace, plus the owner's normal booking email
   and cancellation link.

## Owner-site changes (this app)

1. **Marketplace source.** Add `source = "marketplace"` next to the existing
   ad sources in `src/lib/attribution.ts`, plus `MARKETPLACE_FEE_PERCENT`
   (separate from `PLATFORM_AD_FEE_PERCENT`). Reuse `feeParams()` in
   `src/lib/stripe.ts`. Refunds already return fees proportionally.
2. **Signed checkout requests.** `checkout_sessions` accepts a request from the
   marketplace, signed with an HMAC secret shared per owner
   (`MARKETPLACE_SHARED_SECRET`). Only signed requests may:
   - set `source = "marketplace"` (so nobody can claim the fee tag), and
   - set success/cancel URLs, which must be on an allowlisted marketplace
     origin (no open redirect).
3. **Public listing endpoint.** One `/api/marketplace/listing` response
   with everything a card and property page need (settings, rooms, photos,
   policies, permit number, launch-gate status). This saves the marketplace
   from calling five endpoints per property.
4. **Opt-in.** An owner setting "List on the marketplace" (off by default).
   A property is listed only when opted in **and** the launch gate is open
   (permit, TOT certificate, tax rates, Stripe can take charges).
5. **Earnings.** Admin → Earnings shows marketplace bookings and fees as their
   own row.
6. **Provisioning.** `provision-owner.js` generates the shared secret, sets it
   on the owner's Vercel project and registers the site with the marketplace.

## Marketplace app

- **Registry table:** property id, base URL, shared secret, listed flag,
  area/coordinates, last sync. Filled by provisioning, not by hand.
- **Listing cache:** pull each site's listing every 15 minutes (same cadence as
  the calendar sync). Pages render from the cache so one slow owner site never
  slows search.
- **Availability search:** query each listed site's `/api/availability` in
  parallel with a short timeout. A site that doesn't answer is hidden from
  results, not shown as available. Fine up to ~50 properties. Past that, cache
  blocked dates nightly and recheck only the final pick live.
- **Final check at booking:** the owner site re-validates dates and price when
  it creates the checkout (it already does for its own site), so a stale cache
  can never double-book.
- **Reviews:** stored in the marketplace DB, one per completed stay. The
  owner's post-checkout email (`src/lib/followups.ts`) links to the marketplace
  review page when the booking came from the marketplace.
- **Guest accounts:** not needed at launch. Booking lookup by email link, as
  owner sites do now.
- **Stack:** Next.js + Tailwind like the owner app; same rate limiting and
  security headers.

## Fees

- **Recommended start:** host-side commission only (for example 5–8% of
  pre-tax rent), taken as the Stripe application fee. Guests see the same price
  as on the owner's own site, which beats Airbnb's guest service fee and is the
  main pitch.
- **Optional later:** a small guest service fee added as a line item and
  included in the application fee.
- Owner sites keep the monthly subscription from `MULTI_OWNER_PLAN.md` step 8.
  The commission is extra and only on marketplace bookings.

## Legal and operations (before the first marketplace booking)

- **California real estate license:** ask a CA attorney whether a per-booking
  commission for renting others' property needs a broker license, or whether a
  platform that lists and processes payments (owner is merchant of record) is
  exempt. If it isn't, fall back to a flat listing fee per month.
- **Permits:** show each STR permit number on its listing. Confirm whether
  Placer County (and any other county added) puts duties on platforms, such as
  delisting unpermitted rentals or collecting/remitting TOT. Today each owner
  collects TOT on their own account; keep it that way unless the county says
  otherwise.
- **Terms:** guest terms of service (platform is not the host), host
  agreement (commission, listing standards, cancellations, damage, removal),
  privacy policy.
- **Insurance:** owners must carry short-term rental liability insurance
  (checked at opt-in). Platform carries general liability and E&O.
- **Entity:** run the marketplace through the LLC.
- **Support:** decide who answers guests (owner for stay issues, platform for
  booking/payment issues) and put both contacts on the confirmation.
- **Trademark:** pick a name clearly distinct from Airbnb; search USPTO before
  buying the domain.

## Build order

1. Owner-site changes 1–4 (fee source, signed checkout, listing endpoint,
   opt-in), with tests for the signature and redirect allowlist.
2. Marketplace skeleton: registry, listing cache, property pages (no booking).
   Launch it as a browse-only site linking to owner sites while legal is
   confirmed.
3. Search by dates and in-marketplace booking.
4. Reviews.
5. Provisioning and fleet tooling register new owners automatically.
6. Owner earnings view for marketplace bookings.

## Open questions

- Brand name and domain.
- Commission rate, and whether to add a guest fee.
- Attorney's answer on licensing, which decides commission vs flat fee.
- Will every owner join, or keep some owners as site-only customers?
