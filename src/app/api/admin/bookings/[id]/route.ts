import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { notifyAdminOfBooking, NotificationType } from '@/lib/notifications';
import { verifyAdmin } from '@/lib/adminAuth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function initStripe(): Stripe | null {
    const raw = process.env.STRIPE_SECRET_KEY;
    if (!raw) return null;
    const key = raw.trim();
    if (!key || key.toLowerCase().includes('placeholder') || key.toLowerCase().includes('waiting')) return null;
    return new Stripe(key, { apiVersion: '2026-01-28.clover' as any });
}

// ── GET /api/admin/bookings/[id] ──────────────────────────────────────────────
export async function GET(request: Request) {
    try {
        verifyAdmin(request);
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        if (!id) return NextResponse.json({ error: 'Booking id required' }, { status: 400 });

        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(booking);
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message || 'Failed to fetch booking' }, { status: 401 });
    }
}

// ── PATCH /api/admin/bookings/[id] ────────────────────────────────────────────
export async function PATCH(request: Request) {
    try {
        verifyAdmin(request);
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        if (!id) return NextResponse.json({ error: 'Booking id required' }, { status: 400 });

        const body = await request.json();
        const { status, notes } = body;

        const existing = await prisma.booking.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

        // ── Cancellation handling ────────────────────────────────────────────
        if (status === 'cancelled' && existing.status !== 'cancelled') {
            // Issue Stripe refund if the booking was paid
            if (existing.status === 'paid' && existing.stripePaymentIntentId) {
                const stripe = initStripe();
                if (stripe) {
                    try {
                        await stripe.refunds.create({ payment_intent: existing.stripePaymentIntentId });
                        console.log(`[Cancel] Refunded payment intent ${existing.stripePaymentIntentId} for booking ${id}`);
                    } catch (refundErr: any) {
                        // Log but don't block — admin may cancel even if Stripe refund fails (e.g. already refunded)
                        console.error(`[Cancel] Stripe refund failed for booking ${id}:`, refundErr.message);
                    }
                } else {
                    console.log('[Cancel] Skipping Stripe refund (mock/placeholder key active)');
                }
            }

            // Send cancellation email to guest using DB template if available,
            // falling back to a sensible plain-text email.
            try {
                const checkIn = new Date(existing.startDate).toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                });
                const checkOut = new Date(existing.endDate).toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                });

                await sendEmail({
                    to: existing.email,
                    templateName: 'booking_cancellation',   // use DB template if seeded
                    variables: {
                        guestName: existing.guestName,
                        startDate: checkIn,
                        endDate: checkOut,
                        bookingId: existing.id,
                        refunded: existing.status === 'paid' ? 'yes' : 'no',
                    },
                    bookingId: existing.id,
                    // Fallback subject + body used when the DB template doesn't exist
                    fallbackSubject: 'Your Whistle Inn booking has been cancelled',
                    fallbackHtml: `
                        <p>Hi ${existing.guestName},</p>
                        <p>Your booking at <strong>Whistle Inn</strong> has been cancelled.</p>
                        <ul>
                          <li>Check-in: ${checkIn}</li>
                          <li>Check-out: ${checkOut}</li>
                          <li>Booking ID: ${existing.id}</li>
                        </ul>
                        ${existing.status === 'paid'
                            ? '<p>A full refund has been initiated and should appear within 5–10 business days.</p>'
                            : ''}
                        <p>If you have questions, please reply to this email or contact us directly.</p>
                    `,
                });
            } catch (emailErr) {
                console.error(`[Cancel] Failed to send cancellation email for booking ${id}:`, emailErr);
                // Non-blocking — cancellation still proceeds
            }
        }

        // ── Persist the update ───────────────────────────────────────────────
        const updateData: any = { status };
        if (notes !== undefined) updateData.notes = notes;

        // Clear expiresAt when transitioning out of pending in either direction:
        // - cancelled → no longer holds dates, expiry is irrelevant
        // - paid (manual mark-as-paid) → permanent hold, no TTL needed
        if (status === 'cancelled' || status === 'paid') {
            updateData.expiresAt = null;
        }

        const updated = await prisma.booking.update({ where: { id }, data: updateData });

        // ── Post-update side effects ─────────────────────────────────────────
        if (status === 'cancelled') {
            try {
                await notifyAdminOfBooking(NotificationType.BOOKING_CANCELLED, updated);
            } catch (notifyErr) {
                console.error(`[Cancel] Admin notification failed for booking ${id}:`, notifyErr);
            }
        }

        // If manually marked paid (rare — normally handled by webhook), generate token + send confirmation
        if (status === 'paid' && existing.status !== 'paid') {
            try {
                // Generate cancellation token if not already set
                const cancellationToken = updated.cancellationToken || randomBytes(32).toString('hex');
                if (!updated.cancellationToken) {
                    await prisma.booking.update({
                        where: { id: updated.id },
                        data: { cancellationToken },
                    });
                }

                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thewhistleinn.com';
                const cancelUrl = `${baseUrl}/cancel/${cancellationToken}`;
                const checkIn = new Date(updated.startDate).toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                });
                const checkOut = new Date(updated.endDate).toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                });

                await sendEmail({
                    to: updated.email,
                    templateName: 'booking_confirmation',
                    variables: {
                        guestName: updated.guestName,
                        startDate: checkIn,
                        endDate: checkOut,
                        bookingId: updated.id,
                        amount: String(updated.totalPrice),
                        cancelUrl,
                    },
                    bookingId: updated.id,
                    fallbackSubject: 'Your Whistle Inn booking is confirmed! 🎉',
                    fallbackHtml: `
                        <p>Hi ${updated.guestName},</p>
                        <p>Your stay at <strong>Whistle Inn</strong> is confirmed!</p>
                        <ul>
                          <li><strong>Check-in:</strong> ${checkIn}</li>
                          <li><strong>Check-out:</strong> ${checkOut}</li>
                          <li><strong>Total paid:</strong> $${updated.totalPrice}</li>
                          <li><strong>Booking ID:</strong> ${updated.id}</li>
                        </ul>
                        <p>Need to cancel? <a href="${cancelUrl}">Click here</a></p>
                        <p><em>Policy: Full refund 5+ days before check-in. 50% refund 1–4 days before. No refund within 24 h of check-in.</em></p>
                    `,
                });
            } catch (e) {
                console.error('[Paid] Failed sending confirmation email after manual mark-paid:', e);
            }
        }

        return NextResponse.json(updated);
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message || 'Failed to update booking' }, { status: 401 });
    }
}

// ── DELETE /api/admin/bookings/[id] ───────────────────────────────────────────
// Permanently removes a booking record. Only allowed on cancelled bookings
// to prevent accidental deletion of active/paid stays.
export async function DELETE(request: Request) {
    try {
        verifyAdmin(request);
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        if (!id) return NextResponse.json({ error: 'Booking id required' }, { status: 400 });

        const existing = await prisma.booking.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

        if (existing.status !== 'cancelled') {
            return NextResponse.json(
                { error: 'Only cancelled bookings can be deleted. Cancel the booking first.' },
                { status: 400 }
            );
        }

        // Delete associated email logs first (FK constraint)
        await prisma.emailLog.deleteMany({ where: { bookingId: id } });
        await prisma.booking.delete({ where: { id } });

        console.log(`[Delete] Booking ${id} permanently deleted by admin`);
        return NextResponse.json({ success: true, id });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message || 'Failed to delete booking' }, { status: 401 });
    }
}
