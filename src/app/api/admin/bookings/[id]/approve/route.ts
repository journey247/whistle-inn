import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';
import { sendEmail } from '@/lib/email';
import { conflictingBookingWhere, conflictingExternalWhere } from '@/lib/availability';
import { PROPERTY, SITE_URL } from '@/config/property';
import { getStripe, getChargeAccountId, onAccount, adFeePercent, feeParams } from '@/lib/stripe';
import { adFeeFor } from '@/lib/attribution';

export const dynamic = 'force-dynamic';

/**
 * How long an approved request holds its dates while the guest pays.
 *
 * The guest gets the link by email, not in an open browser tab, so the 30
 * minutes a live checkout gets is far too short. Stripe caps a Checkout
 * Session at 24 hours; stay just under that so the booking's hold and the
 * session expire together rather than the hold outliving a dead link.
 */
const PAYMENT_WINDOW_MS = 23 * 60 * 60 * 1000;

/** Put an approval that never produced a payment link back in the queue. */
async function revertToRequested(bookingId: string) {
    try {
        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'requested', expiresAt: null, stripeSessionId: null, stripeAccountId: null, platformFee: 0 },
        });
    } catch (err) {
        console.error(`Failed to revert booking ${bookingId} to requested:`, err);
    }
}

/**
 * POST /api/admin/bookings/[id]/approve
 *
 * Accept a booking request taken while online checkout was paused.
 *
 * The request held no dates, so someone else may have booked them since —
 * the conflict check runs again here, in the same serializable transaction
 * that moves the booking to pending. Only then is the guest sent a Stripe
 * link; paying it marks the booking paid through the normal webhook.
 */
export async function POST(request: Request) {
    try {
        const admin = await requireAdmin(request);

        // /api/admin/bookings/<id>/approve
        const segments = new URL(request.url).pathname.split('/');
        const id = segments[segments.length - 2];
        if (!id) return NextResponse.json({ error: 'Booking id required' }, { status: 400 });

        const isProduction = process.env.NODE_ENV === 'production';
        const stripe = getStripe();
        if (!stripe && isProduction) {
            return NextResponse.json(
                { error: 'Stripe is not configured, so no payment link can be created.' },
                { status: 503 }
            );
        }

        const now = new Date();
        const holdUntil = new Date(now.getTime() + PAYMENT_WINDOW_MS);

        let booking;
        try {
            booking = await prisma.$transaction(async (tx) => {
                const existing = await tx.booking.findUnique({
                    where: { id },
                    include: { room: { select: { name: true, slug: true } } },
                });
                if (!existing) {
                    throw Object.assign(new Error('Booking not found'), { code: 'NOT_FOUND' });
                }
                if (existing.status !== 'requested') {
                    throw Object.assign(new Error(`This booking is already ${existing.status}`), { code: 'BAD_STATE' });
                }

                const [conflicts, external] = await Promise.all([
                    tx.booking.findMany({
                        where: conflictingBookingWhere(existing.startDate, existing.endDate, existing.roomId, now),
                        select: { id: true },
                    }),
                    tx.externalBooking.findMany({
                        where: conflictingExternalWhere(existing.startDate, existing.endDate),
                        select: { id: true },
                    }),
                ]);
                if (conflicts.length > 0 || external.length > 0) {
                    throw Object.assign(
                        new Error('Those dates have been booked since this request came in. Decline it or contact the guest about other dates.'),
                        { code: 'CONFLICT' }
                    );
                }

                const updated = await tx.booking.update({
                    where: { id },
                    data: { status: 'pending', expiresAt: holdUntil },
                    include: { room: { select: { name: true, slug: true } } },
                });
                return updated;
            }, { isolationLevel: 'Serializable' });
        } catch (err: any) {
            if (err.code === 'NOT_FOUND') return NextResponse.json({ error: err.message }, { status: 404 });
            if (err.code === 'BAD_STATE') return NextResponse.json({ error: err.message }, { status: 400 });
            if (err.code === 'CONFLICT') return NextResponse.json({ error: err.message }, { status: 409 });
            throw err;
        }

        const nights = Math.round((booking.endDate.getTime() - booking.startDate.getTime()) / 86400000);
        const accommodation = booking.room ? booking.room.name : 'The whole house';
        const baseUrl = request.headers.get('origin') || SITE_URL;

        let session: { id: string; url: string | null };
        const chargeAccountId = stripe ? await getChargeAccountId() : null;
        // The request recorded its source when it was made; the fee is on the
        // pre-tax amount the guest was quoted.
        const subtotal = booking.totalPrice - booking.occupancyTax - booking.assessmentTax;
        const platformFee = chargeAccountId ? adFeeFor(booking.source, subtotal, adFeePercent()) : 0;
        if (!stripe) {
            // Development only (production returned 503 above).
            const mockId = 'cs_test_mock_' + Date.now();
            session = { id: mockId, url: `${baseUrl}/success?session_id=${mockId}&booking_id=${booking.id}` };
        } else {
            try {
                const checkIn = booking.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const checkOut = booking.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                // Charged at the total quoted when the guest made the request
                // (cleaning fee, any coupon and occupancy tax already included),
                // so approving a request never changes the price the guest was shown.
                const taxTotal = booking.occupancyTax + booking.assessmentTax;
                const includes = taxTotal > 0 ? 'includes cleaning fee and occupancy tax' : 'includes cleaning fee';
                session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    mode: 'payment',
                    ...feeParams(chargeAccountId, platformFee),
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `${PROPERTY.name} — ${booking.room ? booking.room.name : 'Whole House'}`,
                                description: `${nights} night${nights !== 1 ? 's' : ''} · ${checkIn} to ${checkOut} · ${includes}`,
                            },
                            unit_amount: Math.round(booking.totalPrice * 100),
                        },
                        quantity: 1,
                    }],
                    customer_email: booking.email,
                    expires_at: Math.floor(holdUntil.getTime() / 1000),
                    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
                    cancel_url: `${baseUrl}/?canceled=true`,
                    phone_number_collection: { enabled: true },
                    metadata: {
                        bookingId: booking.id,
                        guestCount: String(booking.guestCount),
                        couponId: booking.couponId || '',
                        roomSlug: booking.room?.slug || '',
                        roomName: booking.room?.name || 'Whole property',
                        checkIn: booking.startDate.toISOString(),
                        checkOut: booking.endDate.toISOString(),
                        nights: String(nights),
                        approvedBy: admin.email,
                    },
                }, onAccount(chargeAccountId));
            } catch (err) {
                await revertToRequested(booking.id);
                throw err;
            }
        }

        await prisma.booking.update({
            where: { id: booking.id },
            data: { stripeSessionId: session.id, stripeAccountId: chargeAccountId, platformFee },
        });

        // The link is returned to the admin as well, so a failed email never
        // strands an approval: the owner can text or read it to the guest instead.
        let emailed = false;
        try {
            const checkIn = booking.startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const checkOut = booking.endDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            await sendEmail({
                to: booking.email,
                templateName: 'booking_request_approved',
                variables: {
                    guestName: booking.guestName,
                    accommodation,
                    startDate: checkIn,
                    endDate: checkOut,
                    amount: booking.totalPrice.toFixed(2),
                    paymentUrl: session.url ?? '',
                    bookingId: booking.id,
                },
                bookingId: booking.id,
                fallbackSubject: `Your ${PROPERTY.name} booking is approved — complete your payment`,
                fallbackHtml: `
                    <p>Hi ${booking.guestName},</p>
                    <p>Good news — your booking request at <strong>${PROPERTY.name}</strong> has been approved.</p>
                    <ul>
                      <li><strong>Your booking:</strong> ${accommodation}</li>
                      <li><strong>Check-in:</strong> ${checkIn}</li>
                      <li><strong>Check-out:</strong> ${checkOut}</li>
                      <li><strong>Total:</strong> $${booking.totalPrice.toFixed(2)}</li>
                    </ul>
                    <p><a href="${session.url}">Complete your payment here</a> to confirm your stay.</p>
                    <p>We're holding these dates for you for the next 23 hours. After that the link expires and the dates are released.</p>
                    <p>See you soon!<br>${PROPERTY.hostName} &amp; the ${PROPERTY.name} team</p>
                `,
            });
            emailed = true;
        } catch (emailErr) {
            console.error(`Failed to email payment link for booking ${booking.id}:`, emailErr);
        }

        console.log(`Booking request ${booking.id} approved by ${admin.email}`);

        return NextResponse.json({
            id: booking.id,
            status: 'pending',
            expiresAt: holdUntil.toISOString(),
            paymentUrl: session.url,
            emailed,
        });
    } catch (err: any) {
        if (err instanceof AdminAuthError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Booking approval error:', err);
        return NextResponse.json({ error: err.message || 'Failed to approve booking' }, { status: 500 });
    }
}
