import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';
import { sendEmail } from '@/lib/email';
import { getProperty } from '@/lib/property';
import { getStripe, onAccount } from '@/lib/stripe';
import {
    validateDamageClaim, describeChargeFailure, statusFromIntent, damageIdempotencyKey,
    isUnconfirmed, countsTowardCap, inClaimWindow, remainingCap, UNCONFIRMED_MESSAGE,
    type DamageChargeStatus,
} from '@/lib/damage-charge';

export const dynamic = 'force-dynamic';

/**
 * Vercel stops API functions at 30s (vercel.json). Keep Stripe well inside
 * that: one 12s attempt plus one retry with the same idempotency key.
 */
const STRIPE_OPTS = { timeout: 12_000, maxNetworkRetries: 1 } as const;
/** Stripe keeps idempotency keys for 24h; stay under it. */
const IDEMPOTENCY_SAFE_MS = 23 * 60 * 60 * 1000;

/** /api/admin/bookings/<id>/damage-charge */
function bookingIdFrom(request: Request): string | undefined {
    const segments = new URL(request.url).pathname.split('/');
    return segments[segments.length - 2] || undefined;
}

function errorResponse(err: any, fallback: string) {
    if (err instanceof AdminAuthError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(`${fallback}:`, err);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

const CHARGE_FIELDS = {
    id: true, requestId: true, amount: true, note: true, status: true,
    failureMessage: true, guestEmailed: true, createdBy: true, createdAt: true,
} as const;

/** GET — whether a card is on file, what can still be charged, and the charges so far. */
export async function GET(request: Request) {
    try {
        await requireAdmin(request);
        const id = bookingIdFrom(request);
        if (!id) return NextResponse.json({ error: 'Booking id required' }, { status: 400 });

        const booking = await prisma.booking.findUnique({
            where: { id },
            select: {
                startDate: true,
                endDate: true,
                stripeCustomerId: true,
                stripePaymentMethodId: true,
                damageCharges: { orderBy: { createdAt: 'desc' }, select: CHARGE_FIELDS },
            },
        });
        if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const held = booking.damageCharges.filter(c => countsTowardCap(c.status)).reduce((s, c) => s + c.amount, 0);
        return NextResponse.json({
            cardOnFile: !!(booking.stripeCustomerId && booking.stripePaymentMethodId),
            inWindow: inClaimWindow(booking.startDate, booking.endDate),
            remaining: remainingCap(held),
            charges: booking.damageCharges,
        });
    } catch (err) {
        return errorResponse(err, 'Failed to load damage charges');
    }
}

/**
 * POST { amount, note, requestId } — charge the guest's saved card.
 *
 * requestId is made once per charge in the admin panel. The charge row is
 * written (status 'pending') BEFORE Stripe is called, and the Stripe
 * idempotency key is built from requestId. So:
 *  - a double click, a timeout or a crash after Stripe took the money never
 *    leads to a second charge: sending the same requestId again replays the
 *    same Stripe request and settles the row;
 *  - a requestId that already has a row is charged with the row's amount and
 *    note, whatever the new body says.
 *
 * Responses: 200 succeeded · 402 declined / bank approval needed (definite)
 * · 202 not confirmed (retry with the same requestId).
 */
export async function POST(request: Request) {
    try {
        const admin = await requireAdmin(request);
        const id = bookingIdFrom(request);
        if (!id) return NextResponse.json({ error: 'Booking id required' }, { status: 400 });

        const body = await request.json().catch(() => ({}));
        const requestId = typeof body.requestId === 'string' && /^[\w-]{8,64}$/.test(body.requestId) ? body.requestId : null;
        if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 });

        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

        const stripe = getStripe();
        if (!stripe) {
            return NextResponse.json({ error: 'Payments are not configured.' }, { status: 503 });
        }

        // ── 1. Find or create the row for this attempt ─────────────────────
        let charge = await prisma.damageCharge.findUnique({ where: { requestId } });
        if (charge && charge.bookingId !== booking.id) {
            return NextResponse.json({ error: 'requestId belongs to another booking' }, { status: 400 });
        }

        if (!charge) {
            try {
                // Serializable: the cap check and the new row can't interleave
                // with another attempt on the same stay.
                charge = await prisma.$transaction(async (tx) => {
                    const rows = await tx.damageCharge.findMany({
                        where: { bookingId: booking.id },
                        select: { amount: true, status: true },
                    });
                    const held = rows.filter(r => countsTowardCap(r.status)).reduce((s, r) => s + r.amount, 0);
                    const claim = validateDamageClaim(
                        { ...booking, alreadyCharged: held },
                        { amount: body.amount, note: body.note },
                    );
                    if (!claim.ok) throw Object.assign(new Error(claim.error), { code: 'INVALID_CLAIM' });
                    return tx.damageCharge.create({
                        data: {
                            bookingId: booking.id,
                            requestId,
                            amount: claim.amount,
                            note: claim.note,
                            status: 'pending',
                            createdBy: admin.email,
                        },
                    });
                }, { isolationLevel: 'Serializable' });
            } catch (err: any) {
                if (err?.code === 'INVALID_CLAIM') {
                    return NextResponse.json({ error: err.message }, { status: 400 });
                }
                // Same requestId raced in from a double click: use that row.
                if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                    charge = await prisma.damageCharge.findUnique({ where: { requestId } });
                } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
                    return NextResponse.json(
                        { error: 'Another charge on this stay was being saved at the same moment. Try again.' },
                        { status: 409 },
                    );
                } else {
                    throw err;
                }
            }
        }
        if (!charge) throw new Error('Damage charge row missing after create');

        // ── 2. Settled already? Report it as is (a replay). ───────────────
        if (!isUnconfirmed(charge.status)) {
            return respond(charge);
        }

        // ── 3. Charge (or re-check) with the stored amount and note ────────
        let status: DamageChargeStatus;
        let failureMessage: string | null = null;
        let paymentIntentId: string | null = charge.stripePaymentIntentId;
        const property = await getProperty();

        try {
            const acct = onAccount(booking.stripeAccountId);
            // Stripe forgets idempotency keys after 24h, so an old unconfirmed
            // attempt is looked up, never re-sent: re-sending could charge twice.
            const stale = Date.now() - charge.createdAt.getTime() > IDEMPOTENCY_SAFE_MS;
            let existing: Stripe.PaymentIntent | null = null;
            if (charge.stripePaymentIntentId) {
                existing = await stripe.paymentIntents.retrieve(charge.stripePaymentIntentId, undefined, { ...acct, ...STRIPE_OPTS });
            } else if (stale) {
                const found = await stripe.paymentIntents.search(
                    { query: `metadata['damageChargeId']:'${charge.id}'`, limit: 1 },
                    { ...acct, ...STRIPE_OPTS },
                );
                existing = found.data[0] ?? null;
                if (!existing) {
                    charge = await prisma.damageCharge.update({
                        where: { id: charge.id },
                        data: { status: 'failed', failureMessage: 'This charge never reached Stripe. The guest was not charged.' },
                    });
                    return respond(charge);
                }
            }

            // Charged on the account that took the booking payment — the
            // saved card only exists there.
            const pi = existing ?? await stripe.paymentIntents.create(
                {
                    amount: Math.round(charge.amount * 100),
                    currency: 'usd',
                    customer: booking.stripeCustomerId!,
                    payment_method: booking.stripePaymentMethodId!,
                    off_session: true,
                    confirm: true,
                    description: `Damage charge — ${property.name} — booking ${booking.id}`,
                    statement_descriptor_suffix: 'DAMAGE',
                    receipt_email: booking.email,
                    metadata: { bookingId: booking.id, kind: 'damage_charge', damageChargeId: charge.id, note: charge.note.slice(0, 450) },
                },
                {
                    ...acct,
                    ...STRIPE_OPTS,
                    idempotencyKey: damageIdempotencyKey(booking.id, requestId),
                },
            );
            paymentIntentId = pi.id;
            status = statusFromIntent(pi.status);
            if (status === 'requires_action') {
                failureMessage = describeChargeFailure({ code: 'authentication_required' }).message;
            } else if (status === 'unknown') {
                failureMessage = UNCONFIRMED_MESSAGE;
            } else if (status === 'failed') {
                failureMessage = pi.last_payment_error?.message
                    ? `The card was declined: ${pi.last_payment_error.message}`
                    : `Stripe left the charge as "${pi.status}".`;
            }
        } catch (err: any) {
            const failure = describeChargeFailure(err);
            status = failure.status;
            failureMessage = failure.message;
            paymentIntentId = err?.raw?.payment_intent?.id ?? paymentIntentId;
            if (status === 'unknown') console.error(`[Damage] Unconfirmed charge ${charge.id}:`, err);
        }

        charge = await prisma.damageCharge.update({
            where: { id: charge.id },
            data: { status, failureMessage, stripePaymentIntentId: paymentIntentId },
        });

        // ── 4. Tell the guest, once ────────────────────────────────────────
        if (charge.status === 'succeeded' && !charge.guestEmailed) {
            try {
                await sendEmail({
                    to: booking.email,
                    bookingId: booking.id,
                    subject: `A damage charge from your ${property.name} stay`,
                    body: `
                        <p>Hi ${escapeHtml(booking.guestName)},</p>
                        <p>After your stay at <strong>${escapeHtml(property.name)}</strong>, we charged
                        <strong>$${charge.amount.toFixed(2)}</strong> to the card you booked with, for:</p>
                        <blockquote>${escapeHtml(charge.note)}</blockquote>
                        <p>If you have questions about this charge, reply to this email.</p>
                        <p>${escapeHtml(property.hostName)}</p>
                    `,
                });
                charge = await prisma.damageCharge.update({ where: { id: charge.id }, data: { guestEmailed: true } });
            } catch (emailErr) {
                console.error(`[Damage] Guest email failed for booking ${booking.id}:`, emailErr);
            }
        }

        return respond(charge);
    } catch (err) {
        return errorResponse(err, 'Failed to charge card');
    }
}

function respond(charge: { status: string; failureMessage: string | null; guestEmailed: boolean } & Record<string, unknown>) {
    const httpStatus = charge.status === 'succeeded' ? 200 : isUnconfirmed(charge.status) ? 202 : 402;
    const body: Record<string, unknown> = { charge, emailed: charge.guestEmailed };
    if (httpStatus !== 200) body.error = charge.failureMessage ?? UNCONFIRMED_MESSAGE;
    return NextResponse.json(body, { status: httpStatus });
}

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
