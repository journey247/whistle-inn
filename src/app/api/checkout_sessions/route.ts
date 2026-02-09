import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { eachDayOfInterval } from 'date-fns';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16' as any, // Cast to any to avoid TS version mismatch in demo
});

const WEEKDAY_PRICE = 650; // Mon-Thu
const WEEKEND_PRICE = 700; // Fri-Sun
const CLEANING_FEE = 150;
const MINIMUM_NIGHTS = 3;

// Calculate total price based on day of week
function calculateTotalPrice(startDate: Date, endDate: Date): number {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    // Exclude the last day (checkout day)
    const nightDays = days.slice(0, -1);

    let total = 0;
    nightDays.forEach(day => {
        const dayOfWeek = day.getDay();
        // Friday (5), Saturday (6), Sunday (0) = weekend pricing
        if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
            total += WEEKEND_PRICE;
        } else {
            total += WEEKDAY_PRICE;
        }
    });

    return total;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { startDate, endDate, guestCount } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (nights < MINIMUM_NIGHTS) {
            return NextResponse.json({ error: `Minimum ${MINIMUM_NIGHTS} night stay required` }, { status: 400 });
        }

        if (nights < 1) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        // Check for conflicting bookings
        const conflictingBookings = await prisma.booking.findMany({
            where: {
                OR: [
                    { status: 'paid' },
                    { status: 'pending' } // Include pending to prevent race conditions
                ],
                AND: [
                    { startDate: { lt: end } },
                    { endDate: { gt: start } }
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

        const accommodationTotal = calculateTotalPrice(start, end);
        const totalAmount = accommodationTotal + CLEANING_FEE;

        // Create a pending booking record
        const booking = await prisma.booking.create({
            data: {
                startDate: start,
                endDate: end,
                guestName: "Pending Guest", // Will update after payment
                email: "pending@example.com",
                totalPrice: totalAmount,
                status: 'pending',
            }
        });

        // Create Stripe Checkout Session
        let session: any;
        const isMock = (process.env.STRIPE_SECRET_KEY || 'placeholder').includes('placeholder');

        if (isMock) {
            console.log('Using mock Stripe session');
            session = {
                id: 'cs_test_mock_' + Date.now(),
                url: `${request.headers.get('origin')}/success?session_id=cs_test_mock_${Date.now()}&booking_id=${booking.id}`
            };
        } else {
            session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Whistle Inn Reservation',
                                description: `${nights} nights stay ($650/night Mon-Thu, $700/night Fri-Sun)`,
                            },
                            unit_amount: accommodationTotal * 100,
                        },
                        quantity: 1,
                    },
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Cleaning Fee',
                            },
                            unit_amount: CLEANING_FEE * 100,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
                cancel_url: `${request.headers.get('origin')}/?canceled=true`,
                metadata: {
                    bookingId: booking.id,
                },
            });
        }

        // Update booking with the session ID
        await prisma.booking.update({
            where: { id: booking.id },
            data: { stripeSessionId: session.id }
        });

        return NextResponse.json({ sessionId: session.id, bookingId: booking.id });
    } catch (err: any) {
        console.error('Stripe error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
