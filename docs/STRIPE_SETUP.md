# Stripe Integration Setup Guide

This document explains how Stripe payment integration is configured for the Whistle Inn booking system.

## Overview

The Stripe integration uses the modern **Checkout Session** approach with server-side redirect URLs. This is the recommended pattern as of 2026, replacing the deprecated `redirectToCheckout()` method.

## Architecture

### 1. Booking Flow
```
User selects dates → BookingModal → POST /api/checkout_sessions → 
Stripe Checkout → Success/Cancel redirect → Update booking status
```

### 2. Components

#### Frontend (`src/components/BookingModal.tsx`)
- Collects booking dates from user
- Validates availability
- Sends booking request to checkout API
- **Redirects to Stripe Checkout using**: `window.location.href = session.url`
- No client-side Stripe.js library needed for redirect

#### Checkout API (`src/app/api/checkout_sessions/route.ts`)
- Creates pending booking in database
- Creates Stripe Checkout Session with:
  - Dynamic pricing (weekday/weekend rates)
  - Cleaning fee
  - Success/cancel URLs
  - Booking metadata
- Returns session URL to client

#### Webhook Handler (`src/app/api/stripe/webhook/route.ts`)
- Receives `checkout.session.completed` events from Stripe
- Validates webhook signature
- Updates booking status to "paid"
- Updates guest information from Stripe
- Logs confirmation email

#### Success Page (`src/app/success/page.tsx`)
- Displays booking confirmation
- Shows reservation details
- Fetches booking from database via API
- Provides print and return home options

#### Booking API (`src/app/api/bookings/[id]/route.ts`)
- Retrieves booking details by ID
- Used by success page to display confirmation

## Configuration

### Required Environment Variables

```bash
# Stripe Secret Key (server-side only)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret (for signature verification)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### No Longer Required
- ~~`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`~~ - Not needed with modern redirect pattern
- ~~`STRIPE_PRICE_ID_*`~~ - Using dynamic price_data instead of price IDs

## Pricing Structure

Pricing is calculated dynamically based on:
- **Weekday Rate**: $650/night (Monday-Thursday)
- **Weekend Rate**: $700/night (Friday-Sunday)
- **Cleaning Fee**: $150 (one-time)
- **Minimum Stay**: 3 nights

## Webhook Setup

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select event: `checkout.session.completed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` env var

## Testing

### Local Testing
```bash
# Use mock mode (when STRIPE_SECRET_KEY contains "placeholder")
npm run dev
# Booking flow will use mock session without calling Stripe API
```

### Integration Test
```bash
# Requires Stripe test keys
node tests/integration/payment-flow.test.js
```

## Security Features

1. **Webhook Signature Verification**: All webhook events are verified using Stripe signatures
2. **Server-side Session Creation**: Checkout sessions created server-side to prevent tampering
3. **Booking Validation**: Prevents double-bookings with database constraints
4. **Mock Mode**: Gracefully handles missing Stripe keys in development

## Stripe API Version

Current integration uses: **2026-01-28.clover**

## Migration Notes

This integration was updated from the deprecated `stripe.redirectToCheckout()` pattern to the modern approach:

### Before (Deprecated)
```javascript
const stripe = await loadStripe(publishableKey);
await stripe.redirectToCheckout({ sessionId });
```

### After (Current)
```javascript
// Server returns session.url
const { url } = await response.json();
window.location.href = url;
```

This change:
- Removed need for `@stripe/stripe-js` on client
- Removed need for publishable key
- Simplified client-side code
- Follows Stripe's 2026 best practices

## Troubleshooting

### Checkout Not Working
1. Verify `STRIPE_SECRET_KEY` is set and valid
2. Check server logs for Stripe API errors
3. Ensure session URL is being returned from API

### Webhook Not Firing
1. Verify webhook endpoint is publicly accessible
2. Check `STRIPE_WEBHOOK_SECRET` matches dashboard
3. Review webhook logs in Stripe dashboard

### Success Page Not Loading
1. Verify booking was created (check database)
2. Check `/api/bookings/[id]` endpoint is accessible
3. Ensure success URL includes `session_id` and `booking_id` params

## Additional Resources

- [Stripe Checkout Documentation](https://docs.stripe.com/payments/checkout)
- [Stripe Webhooks Guide](https://docs.stripe.com/webhooks)
- [Migration from redirectToCheckout](https://docs.stripe.com/changelog/clover/2025-09-30/remove-redirect-to-checkout)
