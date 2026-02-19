import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { calculateQuote } from '@/lib/pricing-server';
import { notifyAdminOfBooking, NotificationType } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function initializeStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || secretKey.includes('placeholder')) {
        throw new Error('Stripe secret key not configured');
    }
    return new Stripe(secretKey, {
        apiVersion: '2026-01-28.clover',
    });
}

let stripe: Stripe;
try {
    stripe = initializeStripe();
} catch (err) {
    console.error('Stripe initialization failed:', err);
}


const MINIMUM_NIGHTS = 3;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { startDate, endDate, guestCount: rawGuestCount, guestName, guestEmail } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
        }

        // Validate and sanitize guestCount
        const guestCount = parseInt(String(rawGuestCount ?? 1), 10);
        if (isNaN(guestCount) || guestCount < 1 || guestCount > 10) {
            return NextResponse.json({ error: 'Guest count must be between 1 and 10' }, { status: 400 });
        }

        // Validate guest info
        if (!guestName || typeof guestName !== 'string' || guestName.trim().length < 2) {
            return NextResponse.json({ error: 'Valid guest name is required' }, { status: 400 });
        }
        if (!guestEmail || typeof guestEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
            return NextResponse.json({ error: 'Valid guest email is required' }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        // Get minimum nights from content blocks
        const minNightsBlock = await prisma.contentBlock.findUnique({
            where: { key: 'minimum_nights' }
        });
        const minimumNights = minNightsBlock ? parseInt(minNightsBlock.value) : MINIMUM_NIGHTS;

        // Use server-side quote calculation for security
        const { nights, accommodationTotal, cleaningFee, total, discountAmount, couponId } = await calculateQuote(start, end, body.couponCode);

        if (nights < minimumNights) {
            return NextResponse.json({ error: `Minimum ${minimumNights} night stay required` }, { status: 400 });
        }

        if (nights < 1) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        // --- Atomic conflict check + booking creation ---
        // Use a serializable transaction so the read + write cannot be interleaved
        // with another concurrent checkout request for the same dates.
        const booking = await prisma.$transaction(async (tx) => {
            // Check for conflicting internal bookings
            const conflictingBookings = await tx.booking.findMany({
                where: {
                    AND: [
                        { startDate: { lt: end } },
                        { endDate: { gt: start } },
                        { status: { in: ['paid', 'pending'] } }
                    ]
                }
            });

            // Check for conflicting external (Airbnb/VRBO) bookings
            const conflictingExternal = await tx.externalBooking.findMany({
                where: {
                    AND: [
                        { startDate: { lt: end } },
                        { endDate: { gt: start } }
                    ]
                }
            });

            if (conflictingBookings.length > 0 || conflictingExternal.length > 0) {
                throw Object.assign(new Error('These dates are already booked'), { code: 'CONFLICT' });
            }

            // Create the pending booking atomically with the conflict check
            const newBooking = await tx.booking.create({
                data: {
                    startDate: start,
                    endDate: end,
                    guestName: guestName.trim(),
                    email: guestEmail.trim().toLowerCase(),
                    guestCount,
                    totalPrice: total,
                    discount: discountAmount,
                    couponId: couponId || undefined,
                    status: 'pending',
                }
            });

            // Increment coupon usedCount if a coupon was applied
            if (couponId) {
                await tx.coupon.update({
                    where: { id: couponId },
                    data: { usedCount: { increment: 1 } },
                });
            }

            return newBooking;
        }, {
            // Serializable isolation prevents phantom reads / race conditions
            isolationLevel: 'Serializable',
        });

        // Send admin notification for new booking (outside transaction — non-critical)
        try {
            await notifyAdminOfBooking(NotificationType.BOOKING_CREATED, booking);
        } catch (notificationError) {
            console.error(`Failed to send new booking notification for booking ${booking.id}:`, notificationError);
            // Continue — don't fail checkout because notification failed
        }

        // Create Stripe Checkout Session
        let session: any;
        const isMock = (process.env.STRIPE_SECRET_KEY || 'placeholder').includes('placeholder');

        // Determine base URL safely
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        if (isMock) {
            console.log('Using mock Stripe session');
            session = {
                id: 'cs_test_mock_' + Date.now(),
                url: `${origin}/success?session_id=cs_test_mock_${Date.now()}&booking_id=${booking.id}`
            };
        } else {
            try {
                // Calculate line items handling discounts
                const finalAccommodationPrice = Math.max(0, accommodationTotal - discountAmount);
                const accommodationDescription = discountAmount > 0
                    ? `${nights} nights stay (Discount applied: -$${discountAmount})`
                    : `${nights} nights stay`;

                const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Whistle Inn — Nightly Stay',
                                description: accommodationDescription,
                            },
                            unit_amount: Math.round(finalAccommodationPrice * 100),
                        },
                        quantity: 1,
                    },
                ];

                if (cleaningFee > 0) {
                    lineItems.push({
                        price_data: {
                            currency: 'usd',
                            product_data: { name: 'Cleaning Fee' },
                            unit_amount: Math.round(cleaningFee * 100),
                        },
                        quantity: 1,
                    });
                }

                const checkInDate  = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const checkOutDate = end.toLocaleDateString('en-US',   { month: 'short', day: 'numeric', year: 'numeric' });

                session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: lineItems,
                    mode: 'payment',
                    customer_email: guestEmail.trim().toLowerCase(),
                    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
                    cancel_url: `${origin}/?canceled=true`,
                    phone_number_collection: { enabled: true },
                    custom_text: {
                        submit: { message: `Check-in: ${checkInDate} · Check-out: ${checkOutDate} · ${nights} night${nights !== 1 ? 's' : ''}` },
                    },
                    metadata: {
                        bookingId: booking.id,
                        guestCount: String(guestCount),
                        couponId: couponId || '',
                        checkIn: startDate,
                        checkOut: endDate,
                        nights: String(nights),
                    },
                });
            } catch (err: any) {
                // If Stripe Auth fails (wrong key in dev), fallback to mock
                if (err.statusCode === 401 || err.type === 'StripeAuthenticationError') {
                    console.warn('[Stripe] Auth failed - Using Mock Session Fallback');
                    session = {
                        id: 'cs_test_mock_' + Date.now(),
                        url: `${request.headers.get('origin')}/success?session_id=cs_test_mock_${Date.now()}&booking_id=${booking.id}`
                    };
                } else {
                    throw err;
                }
            }
        }


        // Update booking with the session ID
        await prisma.booking.update({
            where: { id: booking.id },
            data: { stripeSessionId: session.id }
        });

        return NextResponse.json({
            sessionId: session.id,
            bookingId: booking.id,
            url: session.url
        });
    } catch (err: any) {
        if (err.code === 'CONFLICT') {
            return NextResponse.json({ error: 'These dates are already booked' }, { status: 409 });
        }
        console.error('Stripe error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
