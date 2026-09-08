import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { notifyAdminOfPayment, NotificationType } from '@/lib/notifications';

/** Generate a cryptographically secure, URL-safe cancellation token */
function generateCancellationToken(): string {
    return randomBytes(32).toString('hex'); // 64 hex chars — effectively unguessable
}

export const dynamic = 'force-dynamic';

// Initialize Stripe with proper validation — trim() handles \r\n from Vercel env vars
function initializeStripe(): Stripe | null {
    const raw = process.env.STRIPE_SECRET_KEY;
    if (!raw) return null;
    const secretKey = raw.trim();
    if (!secretKey || secretKey.toLowerCase().includes('placeholder') || secretKey.toLowerCase().includes('waiting')) {
        return null;
    }
    return new Stripe(secretKey, { apiVersion: '2026-01-28.clover' });
}

const stripe = initializeStripe();

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

export async function POST(request: Request) {
    if (!stripe) {
        console.error('Stripe not initialized - check STRIPE_SECRET_KEY');
        return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
    }

    try {
        // Read raw body for signature verification
        const buf = Buffer.from(await request.arrayBuffer());
        const sig = request.headers.get('stripe-signature');
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

        if (!sig) {
            console.error('Missing Stripe signature');
            return new Response('Missing signature', { status: 400 });
        }

        if (!webhookSecret || webhookSecret.toLowerCase().includes('placeholder') || webhookSecret.toLowerCase().includes('waiting')) {
            console.error('Webhook secret not configured');
            return new Response('Webhook secret not configured', { status: 500 });
        }

        let event: Stripe.Event;
        try {
            event = stripe!.webhooks.constructEvent(buf, sig, webhookSecret);
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

                    // Generate a secure cancellation token (one-time, stored on booking)
                    const cancellationToken = generateCancellationToken();

                    // Update booking as paid, capturing all guest details from Stripe
                    // Clear expiresAt — paid bookings hold dates permanently
                    const updatedBooking = await prisma.booking.update({
                        where: { id: bookingId },
                        data: {
                            status: 'paid',
                            expiresAt: null,
                            cancellationToken,
                            guestName: session.customer_details?.name || existingBooking.guestName,
                            email: session.customer_details?.email || existingBooking.email,
                            stripePaymentIntentId: typeof session.payment_intent === 'string'
                                ? session.payment_intent
                                : (session.payment_intent as Stripe.PaymentIntent)?.id,
                        },
                    });

                    // Count the coupon use now that payment has actually landed.
                    // Guarded by the `status === 'paid'` early-return above, so a
                    // redelivered webhook won't double-count.
                    if (existingBooking.couponId) {
                        try {
                            await prisma.coupon.update({
                                where: { id: existingBooking.couponId },
                                data: { usedCount: { increment: 1 } },
                            });
                        } catch (couponError) {
                            console.error(`Failed to increment coupon ${existingBooking.couponId} for booking ${bookingId}:`, couponError);
                            // Continue — the booking is paid; a miscount is recoverable
                        }
                    }

                    // Send admin notification for successful payment
                    try {
                        const paymentAmount = session.amount_total ? session.amount_total / 100 : updatedBooking.totalPrice;
                        await notifyAdminOfPayment(NotificationType.PAYMENT_SUCCESS, updatedBooking, paymentAmount);
                    } catch (notificationError) {
                        console.error(`Failed to send payment success notification for booking ${bookingId}:`, notificationError);
                        // Continue - don't fail webhook because notification failed
                    }

                    // Send confirmation email — deduplicated via EmailLog
                    const recipientEmail = session.customer_details?.email || existingBooking.email;
                    const alreadySent = await hasConfirmationBeenSent(bookingId);

                    if (alreadySent) {
                        console.log(`Confirmation email already sent for booking ${bookingId} — skipping duplicate`);
                    } else {
                        try {
                            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thewhistleinn.com';
                            const cancelUrl = `${baseUrl}/cancel/${cancellationToken}`;
                            const guestName = session.customer_details?.name || existingBooking.guestName;
                            const checkIn = new Date(existingBooking.startDate).toLocaleDateString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            });
                            const checkOut = new Date(existingBooking.endDate).toLocaleDateString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            });
                            const amount = (session.amount_total ? session.amount_total / 100 : existingBooking.totalPrice).toFixed(2);

                            await sendEmail({
                                to: recipientEmail,
                                templateName: 'booking_confirmation',
                                variables: {
                                    guestName,
                                    bookingId,
                                    startDate: checkIn,
                                    endDate: checkOut,
                                    amount,
                                    cancelUrl,
                                },
                                bookingId,
                                fallbackSubject: 'Your Whistle Inn booking is confirmed! 🎉',
                                fallbackHtml: `
                                    <p>Hi ${guestName},</p>
                                    <p>Your stay at <strong>Whistle Inn</strong> is confirmed!</p>
                                    <ul>
                                      <li><strong>Check-in:</strong> ${checkIn}</li>
                                      <li><strong>Check-out:</strong> ${checkOut}</li>
                                      <li><strong>Total paid:</strong> $${amount}</li>
                                      <li><strong>Booking ID:</strong> ${bookingId}</li>
                                    </ul>
                                    <p>We look forward to hosting you. If you need to cancel, you can do so here:<br>
                                    <a href="${cancelUrl}">${cancelUrl}</a></p>
                                    <p><em>Cancellation policy: Full refund if cancelled 5+ days before check-in. 50% refund if cancelled 1–4 days before. No refund within 24 hours of check-in.</em></p>
                                    <p>See you soon!<br>Nora &amp; the Whistle Inn team</p>
                                `,
                            });
                            console.log(`Confirmation email sent to ${recipientEmail} for booking ${bookingId}`);
                        } catch (emailError) {
                            console.error(`Failed to send confirmation email for booking ${bookingId}:`, emailError);
                            // Continue - do not fail the webhook because email failed
                        }
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

                // Try to find the associated booking
                const booking = await prisma.booking.findFirst({
                    where: { stripePaymentIntentId: paymentIntent.id }
                });

                if (booking) {
                    try {
                        const paymentAmount = paymentIntent.amount ? paymentIntent.amount / 100 : booking.totalPrice;
                        await notifyAdminOfPayment(NotificationType.PAYMENT_FAILED, booking, paymentAmount);
                    } catch (notificationError) {
                        console.error(`Failed to send payment failed notification for booking ${booking.id}:`, notificationError);
                    }
                }

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
