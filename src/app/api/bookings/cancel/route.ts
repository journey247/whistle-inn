import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { calculateRefund } from '@/lib/cancellationPolicy';
import { sendEmail } from '@/lib/email';
import { notifyAdminOfBooking, NotificationType } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function initStripe(): Stripe | null {
    const raw = process.env.STRIPE_SECRET_KEY;
    if (!raw) return null;
    const key = raw.trim();
    if (!key || key.toLowerCase().includes('placeholder') || key.toLowerCase().includes('waiting')) return null;
    return new Stripe(key, { apiVersion: '2026-01-28.clover' as any });
}

// ── GET /api/bookings/cancel?token=<cancellationToken> ────────────────────────
// Returns booking details + refund preview. No side-effects.
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const token = url.searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Cancellation token required' }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({
            where: { cancellationToken: token },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Invalid or expired cancellation link.' }, { status: 404 });
        }

        if (booking.status === 'cancelled') {
            return NextResponse.json({ error: 'This booking has already been cancelled.' }, { status: 410 });
        }

        if (booking.status !== 'paid') {
            return NextResponse.json({ error: 'Only confirmed (paid) bookings can be cancelled via this link.' }, { status: 400 });
        }

        const refund = calculateRefund(
            booking.totalPrice,
            booking.startDate,
            booking.createdAt,
        );

        return NextResponse.json({
            booking: {
                id: booking.id,
                guestName: booking.guestName,
                startDate: booking.startDate,
                endDate: booking.endDate,
                totalPrice: booking.totalPrice,
                status: booking.status,
            },
            refund,
        });
    } catch (err: any) {
        console.error('[Cancel GET]', err);
        return NextResponse.json({ error: 'Failed to retrieve booking details.' }, { status: 500 });
    }
}

// ── POST /api/bookings/cancel ─────────────────────────────────────────────────
// Executes the cancellation: refund → update DB → send email.
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token } = body;

        if (!token || typeof token !== 'string') {
            return NextResponse.json({ error: 'Cancellation token required' }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({
            where: { cancellationToken: token },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Invalid or expired cancellation link.' }, { status: 404 });
        }

        if (booking.status === 'cancelled') {
            return NextResponse.json({ error: 'This booking has already been cancelled.' }, { status: 410 });
        }

        if (booking.status !== 'paid') {
            return NextResponse.json({ error: 'Only confirmed (paid) bookings can be cancelled via this link.' }, { status: 400 });
        }

        // Calculate refund BEFORE making any changes
        const refund = calculateRefund(
            booking.totalPrice,
            booking.startDate,
            booking.createdAt,
        );

        // ── Stripe refund ────────────────────────────────────────────────────
        let stripeRefundId: string | undefined;

        if (refund.refundAmount > 0 && booking.stripePaymentIntentId) {
            const stripe = initStripe();
            if (stripe) {
                try {
                    const amountCents = Math.round(refund.refundAmount * 100);
                    const stripeRefund = await stripe.refunds.create({
                        payment_intent: booking.stripePaymentIntentId,
                        amount: amountCents,
                    });
                    stripeRefundId = stripeRefund.id;
                    console.log(`[Cancel] Refunded $${refund.refundAmount} (${refund.tier}) for booking ${booking.id}, refund: ${stripeRefundId}`);
                } catch (refundErr: any) {
                    console.error(`[Cancel] Stripe refund failed for booking ${booking.id}:`, refundErr.message);
                    // If partial refund fails, still cancel — admin can handle manually
                }
            } else {
                console.log('[Cancel] Skipping Stripe refund (mock/placeholder key active)');
            }
        }

        // ── Update booking ───────────────────────────────────────────────────
        const updated = await prisma.booking.update({
            where: { id: booking.id },
            data: {
                status: 'cancelled',
                expiresAt: null,
                // Invalidate the token so this link can't be used again
                cancellationToken: null,
                notes: [
                    booking.notes,
                    `Guest self-cancelled on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Refund: ${refund.tier === 'none' ? 'None' : `$${refund.refundAmount} (${refund.tier === 'full' ? '100%' : '50%'})`}.`,
                ].filter(Boolean).join('\n'),
            },
        });

        // ── Send cancellation email to guest ─────────────────────────────────
        try {
            const checkIn = new Date(booking.startDate).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            });
            const checkOut = new Date(booking.endDate).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            });

            const refundLine =
                refund.tier === 'full'
                    ? `<p>A <strong>full refund of $${refund.refundAmount.toFixed(2)}</strong> has been initiated and should appear within 5–10 business days.</p>`
                    : refund.tier === 'half'
                    ? `<p>A <strong>50% refund of $${refund.refundAmount.toFixed(2)}</strong> has been initiated and should appear within 5–10 business days.</p>`
                    : `<p>Unfortunately, based on our cancellation policy, no refund applies for cancellations within 24 hours of check-in.</p>`;

            await sendEmail({
                to: booking.email,
                templateName: 'booking_cancellation',
                variables: {
                    guestName: booking.guestName,
                    startDate: checkIn,
                    endDate: checkOut,
                    bookingId: booking.id,
                    refunded: refund.tier !== 'none' ? 'yes' : 'no',
                },
                bookingId: booking.id,
                fallbackSubject: 'Your Whistle Inn booking has been cancelled',
                fallbackHtml: `
                    <p>Hi ${booking.guestName},</p>
                    <p>Your booking at <strong>Whistle Inn</strong> has been cancelled.</p>
                    <ul>
                      <li>Check-in: ${checkIn}</li>
                      <li>Check-out: ${checkOut}</li>
                      <li>Booking ID: ${booking.id}</li>
                    </ul>
                    ${refundLine}
                    <p>If you have questions, please reply to this email or contact us directly.</p>
                `,
            });
        } catch (emailErr) {
            console.error(`[Cancel] Failed to send cancellation email for booking ${booking.id}:`, emailErr);
        }

        // ── Notify admin ─────────────────────────────────────────────────────
        try {
            await notifyAdminOfBooking(NotificationType.BOOKING_CANCELLED, updated);
        } catch (notifyErr) {
            console.error(`[Cancel] Admin notification failed for booking ${booking.id}:`, notifyErr);
        }

        return NextResponse.json({
            success: true,
            refund,
            message:
                refund.tier === 'none'
                    ? 'Your booking has been cancelled. No refund applies per our cancellation policy.'
                    : `Your booking has been cancelled. A refund of $${refund.refundAmount.toFixed(2)} will appear within 5–10 business days.`,
        });
    } catch (err: any) {
        console.error('[Cancel POST]', err);
        return NextResponse.json({ error: 'Failed to process cancellation. Please contact us directly.' }, { status: 500 });
    }
}
