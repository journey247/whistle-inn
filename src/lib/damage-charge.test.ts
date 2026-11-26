import { describe, expect, it } from 'vitest';
import {
    cardOnFileParams, describeChargeFailure, validateDamageClaim, statusFromIntent, countsTowardCap,
    remainingCap, inClaimWindow, damageIdempotencyKey,
    MAX_DAMAGE_CHARGE, CLAIM_WINDOW_DAYS, type DamageClaimBooking,
} from './damage-charge';

const DAY = 86_400_000;
const booking: DamageClaimBooking = {
    status: 'paid',
    startDate: new Date('2026-11-01T16:00:00Z'),
    endDate: new Date('2026-11-05T11:00:00Z'),
    stripeCustomerId: 'cus_123',
    stripePaymentMethodId: 'pm_123',
};
const afterStay = new Date('2026-11-06T12:00:00Z');
const claim = { amount: 150, note: 'Broken lamp in the master bedroom' };

describe('validateDamageClaim', () => {
    it('accepts a valid claim after the stay', () => {
        expect(validateDamageClaim(booking, claim, afterStay)).toEqual({ ok: true, amount: 150, note: claim.note });
    });

    it('rounds the amount to cents and accepts a numeric string', () => {
        const r = validateDamageClaim(booking, { ...claim, amount: '49.999' }, afterStay);
        expect(r).toMatchObject({ ok: true, amount: 50 });
    });

    it.each([
        ['an unpaid booking', { status: 'pending' }],
        ['no saved customer', { stripeCustomerId: null }],
        ['no saved card', { stripePaymentMethodId: null }],
    ] as const)('refuses %s', (_label, change) => {
        expect(validateDamageClaim({ ...booking, ...change }, claim, afterStay).ok).toBe(false);
    });

    it('refuses before the stay starts', () => {
        expect(validateDamageClaim(booking, claim, new Date(booking.startDate.getTime() - DAY)).ok).toBe(false);
    });

    it('allows during the stay and refuses after the claim window', () => {
        expect(validateDamageClaim(booking, claim, new Date('2026-11-03T12:00:00Z')).ok).toBe(true);
        const late = new Date(booking.endDate.getTime() + (CLAIM_WINDOW_DAYS + 1) * DAY);
        expect(validateDamageClaim(booking, claim, late).ok).toBe(false);
    });

    it.each([0, -5, 0.5, MAX_DAMAGE_CHARGE + 1, NaN, 'abc', undefined])('refuses amount %s', amount => {
        expect(validateDamageClaim(booking, { ...claim, amount }, afterStay).ok).toBe(false);
    });

    it('caps the total across charges on one stay', () => {
        const r = validateDamageClaim({ ...booking, alreadyCharged: MAX_DAMAGE_CHARGE - 100 }, claim, afterStay);
        expect(r.ok).toBe(false);
        expect(validateDamageClaim({ ...booking, alreadyCharged: MAX_DAMAGE_CHARGE - 150 }, claim, afterStay).ok).toBe(true);
    });

    it('requires a real description', () => {
        expect(validateDamageClaim(booking, { ...claim, note: '  lamp   ' }, afterStay).ok).toBe(false);
        expect(validateDamageClaim(booking, { ...claim, note: 'x'.repeat(501) }, afterStay).ok).toBe(false);
    });
});

describe('cardOnFileParams', () => {
    it('saves the card and keeps the ad fee', () => {
        expect(cardOnFileParams({ payment_intent_data: { application_fee_amount: 1200 } })).toEqual({
            customer_creation: 'always',
            payment_intent_data: { application_fee_amount: 1200, setup_future_usage: 'off_session' },
        });
    });

    it('saves the card when there is no fee', () => {
        expect(cardOnFileParams({}).payment_intent_data).toEqual({ setup_future_usage: 'off_session' });
    });
});

describe('describeChargeFailure', () => {
    it('flags a bank that wants the guest to approve', () => {
        expect(describeChargeFailure({ type: 'StripeCardError', code: 'authentication_required' }).status).toBe('requires_action');
    });

    it('reports a decline with the reason', () => {
        const r = describeChargeFailure({ type: 'StripeCardError', code: 'card_declined', message: 'Your card has insufficient funds.' });
        expect(r).toEqual({ status: 'failed', message: 'The card was declined: Your card has insufficient funds.' });
    });
});

describe('unknown outcomes are never treated as declines', () => {
    it.each([
        ['connection error', { type: 'StripeConnectionError', message: 'socket hang up' }],
        ['Stripe outage', { type: 'StripeAPIError', message: 'Internal error' }],
        ['rate limit', { type: 'StripeRateLimitError', message: 'Too many requests' }],
        ['anything else', new Error('boom')],
    ])('%s is unknown, so a retry reuses the same key', (_l, err) => {
        expect(describeChargeFailure(err).status).toBe('unknown');
    });

    it('treats a refused request as a definite failure', () => {
        expect(describeChargeFailure({ type: 'StripeInvalidRequestError', message: 'No such PaymentMethod' }).status).toBe('failed');
    });

    it('maps PaymentIntent states', () => {
        expect(statusFromIntent('succeeded')).toBe('succeeded');
        expect(statusFromIntent('requires_action')).toBe('requires_action');
        expect(statusFromIntent('processing')).toBe('unknown');
        expect(statusFromIntent('requires_payment_method')).toBe('failed');
    });

    it('counts unconfirmed charges toward the cap', () => {
        expect(countsTowardCap('pending')).toBe(true);
        expect(countsTowardCap('unknown')).toBe(true);
        expect(countsTowardCap('succeeded')).toBe(true);
        expect(countsTowardCap('failed')).toBe(false);
        expect(countsTowardCap('requires_action')).toBe(false);
    });
});

describe('cap and window helpers', () => {
    it('allows a total of exactly the cap despite floating point', () => {
        // 4999.99 + 0.01 !== 5000 in floating point
        const r = validateDamageClaim({ ...booking, alreadyCharged: 4999.99 - 99.99 }, { ...claim, amount: 100 }, afterStay);
        expect(r.ok).toBe(true);
        expect(validateDamageClaim({ ...booking, alreadyCharged: 4900.1 }, { ...claim, amount: 99.9 }, afterStay).ok).toBe(true);
    });

    it('reports what is left to charge', () => {
        expect(remainingCap(0)).toBe(MAX_DAMAGE_CHARGE);
        expect(remainingCap(4999.99)).toBe(0.01);
        expect(remainingCap(6000)).toBe(0);
    });

    it('opens the window at check-in and closes it after the claim period', () => {
        expect(inClaimWindow(booking.startDate, booking.endDate, new Date(booking.startDate.getTime() - 1))).toBe(false);
        expect(inClaimWindow(booking.startDate, booking.endDate, booking.startDate)).toBe(true);
        expect(inClaimWindow(booking.startDate, booking.endDate, new Date(booking.endDate.getTime() + CLAIM_WINDOW_DAYS * DAY))).toBe(true);
        expect(inClaimWindow(booking.startDate, booking.endDate, new Date(booking.endDate.getTime() + CLAIM_WINDOW_DAYS * DAY + 1))).toBe(false);
    });

    it('builds the same idempotency key for the same attempt', () => {
        expect(damageIdempotencyKey('b1', 'r1')).toBe(damageIdempotencyKey('b1', 'r1'));
        expect(damageIdempotencyKey('b1', 'r1')).not.toBe(damageIdempotencyKey('b1', 'r2'));
    });
});
