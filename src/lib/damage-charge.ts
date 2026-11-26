import Stripe from 'stripe';

/**
 * Card on file for damage charges.
 *
 * There is no deposit hold. At checkout the guest's card is saved on the
 * account that took the payment (the owner's, under Connect), and the owner can
 * later charge it from the admin panel if something is damaged or missing.
 *
 * A charge made this way can be declined — the card may be cancelled, empty, or
 * the bank may ask the guest to confirm — so it is a way to collect, not a
 * guarantee. Charges and their outcomes are recorded in DamageCharge.
 */

/** Shown to the guest at checkout and in the confirmation email. */
export const CARD_ON_FILE_NOTICE =
    'Your card will be kept on file and may be charged for damage or missing items found after your stay, as set out in the house rules.';

/** Guards against a typo (e.g. 25000 for 250.00). Larger claims go through the owner directly. */
export const MAX_DAMAGE_CHARGE = 5000;
export const MIN_DAMAGE_CHARGE = 1;
/** A claim needs a description the guest (and a card dispute) can see. */
export const MIN_NOTE_LENGTH = 10;
/** Claims must be made close to the stay; after this the card is not charged. */
export const CLAIM_WINDOW_DAYS = 60;

/**
 * Checkout Session params that save the card for later off-session charges,
 * merged with the ad-fee params so neither overwrites the other's
 * payment_intent_data.
 */
export function cardOnFileParams(
    feeParams: { payment_intent_data?: Stripe.Checkout.SessionCreateParams.PaymentIntentData },
): Pick<Stripe.Checkout.SessionCreateParams, 'customer_creation' | 'payment_intent_data'> {
    return {
        customer_creation: 'always',
        payment_intent_data: {
            ...feeParams.payment_intent_data,
            setup_future_usage: 'off_session',
        },
    };
}

export type DamageClaimBooking = {
    status: string;
    startDate: Date;
    endDate: Date;
    stripeCustomerId: string | null;
    stripePaymentMethodId: string | null;
    /** Sum of damage charges that already succeeded on this booking, dollars. */
    alreadyCharged?: number;
};

export type DamageClaimInput = { amount: unknown; note: unknown };

export type DamageClaimResult =
    | { ok: true; amount: number; note: string }
    | { ok: false; error: string };

/** Checks a claim before any money moves. Amount is in dollars, rounded to cents. */
export function validateDamageClaim(
    booking: DamageClaimBooking,
    input: DamageClaimInput,
    now: Date = new Date(),
): DamageClaimResult {
    if (booking.status !== 'paid') {
        return { ok: false, error: 'Only paid bookings can be charged for damage.' };
    }
    if (!booking.stripeCustomerId || !booking.stripePaymentMethodId) {
        return { ok: false, error: 'No card is on file for this booking. It was paid before cards were saved, or outside online checkout.' };
    }
    if (now < booking.startDate) {
        return { ok: false, error: 'The stay has not started yet.' };
    }
    const windowEnds = new Date(booking.endDate.getTime() + CLAIM_WINDOW_DAYS * 86_400_000);
    if (now > windowEnds) {
        return { ok: false, error: `Damage charges must be made within ${CLAIM_WINDOW_DAYS} days of check-out.` };
    }

    const amount = typeof input.amount === 'number' ? input.amount : parseFloat(String(input.amount ?? ''));
    if (!Number.isFinite(amount)) {
        return { ok: false, error: 'Enter an amount.' };
    }
    const rounded = Math.round(amount * 100) / 100;
    if (rounded < MIN_DAMAGE_CHARGE || rounded > MAX_DAMAGE_CHARGE) {
        return { ok: false, error: `Amount must be between $${MIN_DAMAGE_CHARGE} and $${MAX_DAMAGE_CHARGE.toLocaleString('en-US')}.` };
    }
    const alreadyCharged = booking.alreadyCharged ?? 0;
    if (alreadyCharged + rounded > MAX_DAMAGE_CHARGE) {
        return { ok: false, error: `This booking has already been charged $${alreadyCharged.toFixed(2)}; damage charges are capped at $${MAX_DAMAGE_CHARGE.toLocaleString('en-US')} per stay.` };
    }

    const note = typeof input.note === 'string' ? input.note.trim() : '';
    if (note.length < MIN_NOTE_LENGTH) {
        return { ok: false, error: 'Describe what was damaged or missing — the guest sees this.' };
    }
    if (note.length > 500) {
        return { ok: false, error: 'Keep the description under 500 characters.' };
    }

    return { ok: true, amount: rounded, note };
}

/** Plain-language reason for a failed off-session charge, for the owner. */
export function describeChargeFailure(err: any): { status: 'failed' | 'requires_action'; message: string } {
    const code = err?.code ?? err?.raw?.code;
    if (code === 'authentication_required') {
        return {
            status: 'requires_action',
            message: "The guest's bank wants them to approve this charge. Contact the guest to collect it another way.",
        };
    }
    if (err?.type === 'StripeCardError') {
        return { status: 'failed', message: `The card was declined: ${err.message}` };
    }
    return { status: 'failed', message: err?.message || 'The charge failed.' };
}
