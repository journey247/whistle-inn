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
        const { startDate, endDate, guestCount } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get minimum nights from content blocks
        const minNightsBlock = await prisma.contentBlock.findUnique({
            where: { key: 'minimum_nights' }
        });
        const minimumNights = minNightsBlock ? parseInt(minNightsBlock.value) : MINIMUM_NIGHTS;

        // Use server-side quote calculation for security
        const { nights, accommodationTotal, cleaningFee, total, discountAmount, couponId } = await calculateQuote(start, end, body.couponCode);

        // Increase Guest Count if needed (Pricing is per night, not per guest, but we store it)

        if (nights < minimumNights) {
            return NextResponse.json({ error: `Minimum ${minimumNights} night stay required` }, { status: 400 });
        }

        if (nights < 1) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        // Check for conflicting bookings
        const conflictingBookings = await prisma.booking.findMany({
            where: {
                AND: [
                    { startDate: { lt: end } },
                    { endDate: { gt: start } },
                    { status: { in: ['paid', 'pending'] } }
                ]
            }
        });

        const conflictingExternal = await prisma.externalBooking.findMany({
            where: {
                AND: [
                    { startDate: { lt: end } },
                    { endDate: { gt: start } }
                ]
            }
        });

        if (conflictingBookings.length > 0 || conflictingExternal.length > 0) {
            return NextResponse.json({ error: 'These dates are already booked' }, { status: 409 });
        }

        // Create a pending booking record
        const booking = await prisma.booking.create({
            data: {
                startDate: start,
                endDate: end,
                guestName: "Pending Guest", // Will update after payment
                email: "pending@example.com",
                guestCount: guestCount || 1,
                totalPrice: total,
                discount: discountAmount,
                couponId: couponId || undefined,
                status: 'pending',
            }
        });

        // Send admin notification for new booking
        try {
            await notifyAdminOfBooking(NotificationType.BOOKING_CREATED, booking);
        } catch (notificationError) {
            console.error(`Failed to send new booking notification for booking ${booking.id}:`, notificationError);
            // Continue - don't fail checkout because notification failed
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
                // Try to get persistent Stripe cleaning fee product
                const cleaningPriceBlock = await prisma.contentBlock.findUnique({
                    where: { key: 'stripe_cleaning_price_id' }
                });

                // Calculate line items handling discounts
                const finalAccommodationPrice = Math.max(0, accommodationTotal - discountAmount);
                const accommodationDescription = discountAmount > 0
                    ? `${nights} nights stay (Discount applied: -$${discountAmount})`
                    : `${nights} nights stay`;

                const lineItems: any[] = [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Whistle Inn Reservation',
                                description: accommodationDescription,
                            },
                            unit_amount: Math.round(finalAccommodationPrice * 100),
                        },
                        quantity: 1,
                    },
                ];

                // Use persistent product for cleaning fee if available, otherwise dynamic
                if (cleaningPriceBlock?.value) {
                    lineItems.push({
                        price: cleaningPriceBlock.value,
                        quantity: 1,
                    });
                } else {
                    lineItems.push({
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Cleaning Fee',
                            },
                            unit_amount: cleaningFee * 100,
                        },
                        quantity: 1,
                    });
                }

                session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: lineItems,
                    mode: 'payment',
                    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
                    cancel_url: `${origin}/?canceled=true`,
                    metadata: {
                        bookingId: booking.id,
                        guestCount: String(guestCount),
                        couponId: couponId || '',
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
        console.error('Stripe error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
