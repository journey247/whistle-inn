import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';
import { sendEmail } from '@/lib/email';
import { getProperty } from '@/lib/property';
import { getStripe, onAccount } from '@/lib/stripe';
import { validateDamageClaim, describeChargeFailure } from '@/lib/damage-charge';

export const dynamic = 'force-dynamic';

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

/** GET — whether a card is on file, and the charges made so far. */
export async function GET(request: Request) {
    try {
        await requireAdmin(request);
        const id = bookingIdFrom(request);
        if (!id) return NextResponse.json({ error: 'Booking id required' }, { status: 400 });

        const booking = await prisma.booking.findUnique({
            where: { id },
            select: {
                stripeCustomerId: true,
                stripePaymentMethodId: true,
                damageCharges: {
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, amount: true, note: true, status: true, failureMessage: true, createdBy: true, createdAt: true },
                },
            },
        });
        if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json({
            cardOnFile: !!(booking.stripeCustomerId && booking.stripePaymentMethodId),
            charges: booking.damageCharges,
        });
    } catch (err) {
        return errorResponse(err, 'Failed to load damage charges');
    }
}

/**
 * POST { amount, note, requestId } — charge the guest's saved card.
 *
 * requestId is generated once per form submission in the admin panel and used
 * as the Stripe idempotency key, so a double click or a retried request
 * charges the card once.
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

        const charged = await prisma.damageCharge.aggregate({
            where: { bookingId: id, status: 'succeeded' },
            _sum: { amount: true },
        });
        const claim = validateDamageClaim(
            { ...booking, alreadyCharged: charged._sum.amount ?? 0 },
            { amount: body.amount, note: body.note },
        );
        if (!claim.ok) return NextResponse.json({ error: claim.error }, { status: 400 });

        const stripe = getStripe();
        if (!stripe) {
            return NextResponse.json({ error: 'Payments are not configured.' }, { status: 503 });
        }

        const property = await getProperty();
        let status: 'succeeded' | 'failed' | 'requires_action';
        let failureMessage: string | null = null;
        let paymentIntentId: string | null = null;

        try {
            // Charged on the account that took the booking payment — the
            // saved card only exists there.
            const pi = await stripe.paymentIntents.create(
                {
                    amount: Math.round(claim.amount * 100),
                    currency: 'usd',
                    customer: booking.stripeCustomerId!,
                    payment_method: booking.stripePaymentMethodId!,
                    off_session: true,
                    confirm: true,
                    description: `Damage charge — ${property.name} — booking ${booking.id}`,
                    statement_descriptor_suffix: 'DAMAGE',
                    receipt_email: booking.email,
                    metadata: { bookingId: booking.id, kind: 'damage_charge', note: claim.note.slice(0, 450) },
                },
                { ...onAccount(booking.stripeAccountId), idempotencyKey: `damage-${booking.id}-${requestId}` },
            );
            paymentIntentId = pi.id;
            status = pi.status === 'succeeded' ? 'succeeded' : pi.status === 'requires_action' ? 'requires_action' : 'failed';
            if (status !== 'succeeded') failureMessage = `Stripe left the charge as "${pi.status}".`;
        } catch (err: any) {
            const failure = describeChargeFailure(err);
            status = failure.status;
            failureMessage = failure.message;
            paymentIntentId = err?.raw?.payment_intent?.id ?? null;
        }

        // A retried request with the same requestId returns the same intent;
        // record it once.
        const existing = paymentIntentId
            ? await prisma.damageCharge.findFirst({ where: { stripePaymentIntentId: paymentIntentId } })
            : null;
        const record = existing ?? await prisma.damageCharge.create({
            data: {
                bookingId: booking.id,
                amount: claim.amount,
                note: claim.note,
                status,
                failureMessage,
                stripePaymentIntentId: paymentIntentId,
                createdBy: admin.email,
            },
        });

        let emailed = false;
        if (record.status === 'succeeded' && !existing) {
            try {
                await sendEmail({
                    to: booking.email,
                    bookingId: booking.id,
                    fallbackSubject: `A damage charge from your ${property.name} stay`,
                    fallbackHtml: `
                        <p>Hi ${booking.guestName},</p>
                        <p>After your stay at <strong>${property.name}</strong>, we charged
                        <strong>$${claim.amount.toFixed(2)}</strong> to the card you booked with, for:</p>
                        <blockquote>${escapeHtml(claim.note)}</blockquote>
                        <p>If you have questions about this charge, reply to this email.</p>
                        <p>${property.hostName}</p>
                    `,
                });
                emailed = true;
            } catch (emailErr) {
                console.error(`[Damage] Guest email failed for booking ${booking.id}:`, emailErr);
            }
        }

        const ok = record.status === 'succeeded';
        return NextResponse.json(
            { charge: record, emailed, ...(ok ? {} : { error: record.failureMessage }) },
            { status: ok ? 200 : 402 },
        );
    } catch (err) {
        return errorResponse(err, 'Failed to charge card');
    }
}

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
