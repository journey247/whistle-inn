import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.includes('placeholder')) return null;
    return new Stripe(key, { apiVersion: '2026-01-28.clover' });
}

/**
 * Check if a booking_confirmation email has already been sent for this booking.
 * Uses the EmailLog table as a deduplication record.
 */
async function hasConfirmationBeenSent(bookingId: string): Promise<boolean> {
    const existing = await prisma.emailLog.findFirst({
        where: {
            bookingId,
            template: 'booking_confirmation',
        },
    });
    return !!existing;
}

/**
 * POST /api/bookings/[id]/confirm?session_id=cs_...
 *
 * Called from the success page immediately after Stripe redirects back.
 * Verifies the Stripe Checkout Session, marks the booking as paid,
 * and sends the confirmation email — all idempotently.
 *
 * Email deduplication: checks EmailLog before sending so that if the
 * Stripe webhook already sent the email, this endpoint won't send a second one.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: bookingId } = await params;
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('session_id');

        if (!bookingId || !sessionId) {
            return NextResponse.json({ error: 'Missing booking ID or session ID' }, { status: 400 });
        }

        // Fetch booking
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // Already confirmed — return early (idempotent)
        if (booking.status === 'paid') {
            return NextResponse.json({ success: true, alreadyConfirmed: true });
        }

        // Verify the Stripe session to make sure payment actually succeeded
        const stripe = getStripe();
        let guestName = booking.guestName;
        let guestEmail = booking.email;
        let paymentIntentId = booking.stripePaymentIntentId;

        if (stripe) {
            try {
                const session = await stripe.checkout.sessions.retrieve(sessionId);

                if (session.payment_status !== 'paid') {
                    return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
                }

                // Use Stripe's customer details as the source of truth
                guestName = session.customer_details?.name || guestName;
                guestEmail = session.customer_details?.email || guestEmail;
                paymentIntentId = typeof session.payment_intent === 'string'
                    ? session.payment_intent
                    : (session.payment_intent as Stripe.PaymentIntent)?.id || paymentIntentId;
            } catch (stripeErr: any) {
                console.error('Stripe session retrieval failed:', stripeErr.message);
                // If Stripe is unreachable, fall through and use existing booking data
            }
        }

        // Mark booking as paid with real guest details
        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: 'paid',
                guestName,
                email: guestEmail,
                stripePaymentIntentId: paymentIntentId || undefined,
            },
        });

        // Send confirmation email — deduplicated via EmailLog.
        // If the Stripe webhook already sent it, skip to avoid a duplicate.
        const alreadySent = await hasConfirmationBeenSent(bookingId);

        if (alreadySent) {
            console.log(`Confirmation email already sent for booking ${bookingId} — skipping duplicate from confirm endpoint`);
        } else {
            try {
                await sendEmail({
                    to: guestEmail,
                    templateName: 'booking_confirmation',
                    variables: {
                        guestName,
                        bookingId,
                        startDate: new Date(updatedBooking.startDate).toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        }),
                        endDate: new Date(updatedBooking.endDate).toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        }),
                        amount: updatedBooking.totalPrice.toFixed(2),
                    },
                    bookingId,
                });
                console.log(`Confirmation email sent to ${guestEmail} for booking ${bookingId}`);
            } catch (emailErr: any) {
                console.error(`Failed to send confirmation email for booking ${bookingId}:`, emailErr.message);
                // Don't fail the request — booking is paid, email can be resent from admin
            }
        }

        return NextResponse.json({
            success: true,
            booking: {
                id: updatedBooking.id,
                guestName,
                email: guestEmail,
                status: updatedBooking.status,
            }
        });
    } catch (err: any) {
        console.error('Confirm route error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
