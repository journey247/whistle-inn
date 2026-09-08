import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/adminAuth';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { calculateQuote } from '@/lib/pricing-server';
import { notifyAdminOfBooking, NotificationType } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function getStripeKey(): string | null {
    const raw = process.env.STRIPE_SECRET_KEY;
    if (!raw) return null;
    const key = raw.trim(); // strip \r\n or trailing whitespace from Vercel env vars
    if (!key || key.toLowerCase().includes('placeholder') || key.toLowerCase().includes('waiting')) return null;
    return key;
}

function initializeStripe(): Stripe | null {
    const key = getStripeKey();
    if (!key) return null;
    return new Stripe(key, { apiVersion: '2026-01-28.clover' });
}

const stripe = initializeStripe();


const MINIMUM_NIGHTS = 3;

/**
 * Release a pending booking that never made it to Stripe.
 *
 * The pending booking is created before the Checkout Session so the dates are
 * held atomically against concurrent requests. If session creation then fails,
 * those dates would stay blocked for the full 30-minute expiry window for a
 * booking that can never be paid — so cancel it immediately.
 *
 * No coupon adjustment is needed: usedCount is only incremented by the webhook
 * on successful payment, which by definition never happened here.
 *
 * Best-effort: never throws, since the caller is already handling an error.
 */
async function releaseBooking(bookingId: string) {
    try {
        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'cancelled', expiresAt: null },
        });
    } catch (releaseErr) {
        console.error(`Failed to release pending booking ${bookingId}:`, releaseErr);
    }
}

/**
 * Best-effort in-process rate limit on checkout creation.
 *
 * Each successful call creates a pending booking that holds those dates for 30
 * minutes, so an unthrottled endpoint lets anyone take the calendar offline by
 * scripting requests. Per-instance on serverless, so this is friction rather
 * than a guarantee — a shared store is the real fix.
 */
const checkoutRateLimit = new Map<string, { count: number; resetAt: number }>();

function isCheckoutRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = checkoutRateLimit.get(ip);
    if (!entry || now > entry.resetAt) {
        checkoutRateLimit.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
        return false;
    }
    // 5 checkout attempts per 10 minutes is well above what a real guest needs
    if (entry.count >= 5) return true;
    entry.count++;
    return false;
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        if (isCheckoutRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Too many booking attempts. Please wait a few minutes and try again.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { startDate, endDate, guestCount: rawGuestCount, guestName, guestEmail } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
        }

        // Validate and sanitize guestCount against the same limit the booking
        // modal enforces (see /api/settings/public), so raising max_guests in
        // the admin panel doesn't leave the server rejecting valid bookings.
        const maxGuestsBlock = await prisma.contentBlock.findUnique({
            where: { key: 'max_guests' }
        });
        const parsedMaxGuests = maxGuestsBlock ? parseInt(maxGuestsBlock.value, 10) : NaN;
        const maxGuests = Number.isFinite(parsedMaxGuests) && parsedMaxGuests > 0 ? parsedMaxGuests : 10;

        const guestCount = parseInt(String(rawGuestCount ?? 1), 10);
        if (isNaN(guestCount) || guestCount < 1 || guestCount > maxGuests) {
            return NextResponse.json({ error: `Guest count must be between 1 and ${maxGuests}` }, { status: 400 });
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
            // Check for conflicting internal bookings.
            // Exclude expired pending bookings — they no longer hold the dates.
            const now = new Date();
            const conflictingBookings = await tx.booking.findMany({
                where: {
                    AND: [
                        { startDate: { lt: end } },
                        { endDate: { gt: start } },
                        {
                            OR: [
                                { status: 'paid' },
                                // pending only blocks if it hasn't expired yet
                                { status: 'pending', expiresAt: { gt: now } },
                            ]
                        }
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

            // Create the pending booking atomically with the conflict check.
            // expiresAt: 30 minutes — enough time to complete Stripe checkout.
            // After this window, the booking no longer blocks availability.
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
                    expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
                }
            });

            // NOTE: coupon usedCount is deliberately NOT incremented here.
            // It is incremented in the Stripe webhook once payment actually
            // succeeds. Counting it at checkout creation meant abandoned
            // checkouts permanently burned uses off a limited promo.

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
        const isProduction = process.env.NODE_ENV === 'production';

        // stripe is null when the key is missing/placeholder/corrupted.
        // In development we fall back to a mock session so the flow can be
        // exercised without keys. In production that fallback would mark a
        // booking as paid without any payment, so we refuse instead.
        if (!stripe && isProduction) {
            await releaseBooking(booking.id);
            console.error('CRITICAL: STRIPE_SECRET_KEY missing or invalid in production — refusing checkout');
            return NextResponse.json(
                { error: 'Payments are temporarily unavailable. Please contact us to complete your booking.' },
                { status: 503 }
            );
        }

        const isMock = !stripe;

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
                const isAuthFailure = err.statusCode === 401 || err.type === 'StripeAuthenticationError';

                // Mock fallback on auth failure is a DEV convenience only. In
                // production it would hand the guest a fake success URL, so we
                // release the held dates and surface a real error instead.
                if (isAuthFailure && !isProduction) {
                    console.warn('[Stripe] Auth failed - Using Mock Session Fallback (dev only)');
                    session = {
                        id: 'cs_test_mock_' + Date.now(),
                        url: `${origin}/success?session_id=cs_test_mock_${Date.now()}&booking_id=${booking.id}`
                    };
                } else {
                    if (isAuthFailure) {
                        console.error('CRITICAL: Stripe rejected the API key in production — refusing checkout');
                    }
                    await releaseBooking(booking.id);
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
