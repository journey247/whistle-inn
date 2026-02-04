import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16' as any, // Cast to any to avoid TS version mismatch in demo
});

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

        if (nights < 1) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        const PRICE_PER_NIGHT = 450; // Example price
        const CLEANING_FEE = 150;
        const totalAmount = (nights * PRICE_PER_NIGHT) + CLEANING_FEE;

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
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Whistle Inn Reservation',
                            description: `${nights} nights stay`,
                        },
                        unit_amount: (nights * PRICE_PER_NIGHT) * 100,
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

        return NextResponse.json({ sessionId: session.id });
    } catch (err: any) {
        console.error('Stripe error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
