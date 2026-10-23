import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { notifyAdminOfPayment, NotificationType } from '@/lib/notifications';
import { SITE_URL } from '@/config/property';
import { getProperty } from '@/lib/property';
import { getStripe, getConnectState, saveChargesEnabled } from '@/lib/stripe';
import { policySentence } from '@/lib/cancellationPolicy';

/** Generate a cryptographically secure, URL-safe cancellation token */
function generateCancellationToken(): string {
    return randomBytes(32).toString('hex'); // 64 hex chars — effectively unguessable
}

export const dynamic = 'force-dynamic';

const stripe = getStripe();

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
        // Two endpoints can point here: the platform's own events, and the
        // Connect endpoint for events on owners' connected accounts. Each has
        // its own signing secret.
        const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET]
            .map(s => s?.trim())
            .filter((s): s is string => !!s && !s.toLowerCase().includes('placeholder') && !s.toLowerCase().includes('waiting'));

        if (!sig) {
            console.error('Missing Stripe signature');
            return new Response('Missing signature', { status: 400 });
        }

        if (secrets.length === 0) {
            console.error('Webhook secret not configured');
            return new Response('Webhook secret not configured', { status: 500 });
        }

        let event: Stripe.Event | null = null;
        let lastError = '';
        for (const secret of secrets) {
            try {
                event = stripe!.webhooks.constructEvent(buf, sig, secret);
                break;
            } catch (err: any) {
                lastError = err.message;
            }
        }
        if (!event) {
            console.error('⚠️  Webhook signature verification failed:', lastError);
            return new Response(`Webhook signature verification failed: ${lastError}`, { status: 400 });
        }

        // A platform's Connect endpoint receives events for every connected
        // account, including other owners' sites. Only act on this site's.
        if (event.account) {
            const { accountId } = await getConnectState();
            if (event.account !== accountId) {
                return NextResponse.json({ received: true, ignored: 'other account' });
            }
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
                        where: { id: bookingId },
                        // The room is named in the confirmation email: a guest
                        // who booked one bedroom should not be told the house is theirs.
                        include: { room: { select: { name: true } } },
                    });

                    if (!existingBooking) {
                        console.error(`Booking ${bookingId} not found for session ${session.id}`);
                        break;
                    }

                    // The payment must have been taken on the account the
                    // booking was sent to, or a refund later would fail.
                    if ((event.account ?? null) !== (existingBooking.stripeAccountId ?? null)) {
                        console.error(`Session ${session.id} completed on ${event.account ?? 'the platform'}, but booking ${bookingId} expects ${existingBooking.stripeAccountId ?? 'the platform'} — ignoring`);
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
                            const property = await getProperty();
                            const baseUrl = SITE_URL;
                            const cancelUrl = `${baseUrl}/cancel/${cancellationToken}`;
                            const guestName = session.customer_details?.name || existingBooking.guestName;
                            const checkIn = new Date(existingBooking.startDate).toLocaleDateString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            });
                            const checkOut = new Date(existingBooking.endDate).toLocaleDateString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            });
                            const amount = (session.amount_total ? session.amount_total / 100 : existingBooking.totalPrice).toFixed(2);
                            const accommodation = existingBooking.room
                                ? existingBooking.room.name
                                : 'The whole house';

                            await sendEmail({
                                to: recipientEmail,
                                templateName: 'booking_confirmation',
                                variables: {
                                    guestName,
                                    bookingId,
                                    startDate: checkIn,
                                    endDate: checkOut,
                                    amount,
                                    accommodation,
                                    cancelUrl,
                                },
                                bookingId,
                                fallbackSubject: `Your ${property.name} booking is confirmed! 🎉`,
                                fallbackHtml: `
                                    <p>Hi ${guestName},</p>
                                    <p>Your stay at <strong>${property.name}</strong> is confirmed!</p>
                                    <ul>
                                      <li><strong>Your booking:</strong> ${accommodation}</li>
                                      <li><strong>Check-in:</strong> ${checkIn}</li>
                                      <li><strong>Check-out:</strong> ${checkOut}</li>
                                      <li><strong>Total paid:</strong> $${amount}</li>
                                      <li><strong>Booking ID:</strong> ${bookingId}</li>
                                    </ul>
                                    <p>We look forward to hosting you. If you need to cancel, you can do so here:<br>
                                    <a href="${cancelUrl}">${cancelUrl}</a></p>
                                    <p><em>Cancellation policy: ${policySentence(property.cancellation)}</em></p>
                                    <p>See you soon!<br>${property.hostName} &amp; the ${property.name} team</p>
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

            case 'account.updated': {
                // Onboarding finished (or Stripe paused the account): this
                // decides whether new checkouts go to the owner's account.
                const account = event.data.object as Stripe.Account;
                await saveChargesEnabled(account.id, !!account.charges_enabled);
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
