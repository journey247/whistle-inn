import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

// Use placeholders when live keys aren't available yet
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
    try {
        // Read raw body for signature verification
        const buf = Buffer.from(await request.arrayBuffer());
        const sig = request.headers.get('stripe-signature') || '';
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
        } catch (err: any) {
            console.error('⚠️  Webhook signature verification failed.', err.message || err);
            return new Response('Webhook signature verification failed', { status: 400 });
        }

        // Handle the event types you care about
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const bookingId = session.metadata?.bookingId as string | undefined;

                if (bookingId) {
                    // Idempotently mark booking as paid
                    try {
                        await prisma.booking.update({
                            where: { id: bookingId },
                            data: {
                                status: 'paid',
                                guestName: session.customer_details?.name || 'Guest',
                                email: session.customer_details?.email || 'unknown@example.com',
                                stripePaymentIntentId: typeof session.payment_intent === 'string'
                                    ? session.payment_intent
                                    : (session.payment_intent as Stripe.PaymentIntent)?.id,
                            },
                        });

                        await prisma.emailLog.create({
                            data: {
                                to: session.customer_details?.email || 'unknown',
                                subject: 'Booking confirmed',
                                body: `Stripe session ${session.id} completed. Booking ${bookingId} confirmed.`,
                                bookingId,
                            },
                        });
                    } catch (dbErr) {
                        console.error('DB update error for booking confirmation:', dbErr);
                    }
                }
                break;
            }

            case 'payment_intent.succeeded': {
                // Optional: handle direct PaymentIntents if you use them elsewhere
                break;
            }

            default:
                // Unexpected event type
                console.log(`Unhandled event type ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('Webhook handler error:', err);
        return NextResponse.json({ error: err?.message || 'unknown' }, { status: 500 });
    }
}
