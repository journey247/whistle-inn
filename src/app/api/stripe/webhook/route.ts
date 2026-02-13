import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Initialize Stripe with proper validation
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

export async function POST(request: Request) {
    if (!stripe) {
        console.error('Stripe not initialized - check STRIPE_SECRET_KEY');
        return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
    }

    try {
        // Read raw body for signature verification
        const buf = Buffer.from(await request.arrayBuffer());
        const sig = request.headers.get('stripe-signature');
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!sig) {
            console.error('Missing Stripe signature');
            return new Response('Missing signature', { status: 400 });
        }

        if (!webhookSecret || webhookSecret.includes('placeholder')) {
            console.error('Webhook secret not configured');
            return new Response('Webhook secret not configured', { status: 500 });
        }

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
        } catch (err: any) {
            console.error('⚠️  Webhook signature verification failed:', err.message);
            return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
        }

        // Handle the event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const bookingId = session.metadata?.bookingId as string | undefined;

                if (!bookingId) {
                    console.warn('Checkout session completed without booking ID');
                    break;
                }

                try {
                    // Validate booking exists and is in correct state
                    const existingBooking = await prisma.booking.findUnique({
                        where: { id: bookingId }
                    });

                    if (!existingBooking) {
                        console.error(`Booking ${bookingId} not found for session ${session.id}`);
                        break;
                    }

                    if (existingBooking.status === 'paid') {
                        console.log(`Booking ${bookingId} already marked as paid`);
                        break;
                    }

                    // Update booking as paid
                    await prisma.booking.update({
                        where: { id: bookingId },
                        data: {
                            status: 'paid',
                            guestName: session.customer_details?.name || existingBooking.guestName,
                            email: session.customer_details?.email || existingBooking.email,
                            stripePaymentIntentId: typeof session.payment_intent === 'string'
                                ? session.payment_intent
                                : (session.payment_intent as Stripe.PaymentIntent)?.id,
                        },
                    });

                    // Send confirmation email
                    const recipientEmail = session.customer_details?.email || existingBooking.email;
                    try {
                        await sendEmail({
                            to: recipientEmail,
                            templateName: 'booking_confirmation',
                            variables: {
                                guestName: session.customer_details?.name || existingBooking.guestName,
                                bookingId: bookingId,
                                startDate: new Date(existingBooking.startDate).toLocaleDateString(),
                                endDate: new Date(existingBooking.endDate).toLocaleDateString(),
                                amount: (session.amount_total ? session.amount_total / 100 : existingBooking.totalPrice).toFixed(2),
                            },
                            bookingId: bookingId
                        });
                        console.log(`Confirmation email sent to ${recipientEmail} for booking ${bookingId}`);
                    } catch (emailError) {
                        console.error(`Failed to send confirmation email for booking ${bookingId}:`, emailError);
                        // Continue - do not fail the webhook because email failed
                    }

                    console.log(`Booking ${bookingId} successfully confirmed via webhook`);
                } catch (dbErr) {
                    console.error('Database error processing booking confirmation:', dbErr);
                    // Don't return error - Stripe will retry
                }
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.warn(`Payment failed for intent: ${paymentIntent.id}`);
                // Handle failed payment if needed
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('Webhook handler error:', err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
