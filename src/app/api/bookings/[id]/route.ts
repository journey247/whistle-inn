import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/[id]?session_id=<stripeSessionId>
 *
 * Used only by the /success page to show booking confirmation.
 * Requires the Stripe session_id as proof-of-payment — only the guest
 * who completed checkout has this (it's in Stripe's success_url redirect).
 * Returns minimal, non-sensitive fields only.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
        }

        // Require the Stripe session_id — only the real payer has this value.
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('session_id');

        if (!sessionId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Match BOTH booking id AND stripeSessionId so a random booking_id alone is useless.
        const booking = await prisma.booking.findFirst({
            where: { id, stripeSessionId: sessionId },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                guestName: true,
                email: true,
                totalPrice: true,
                status: true,
                createdAt: true,
                // stripeSessionId / stripePaymentIntentId / cancellationToken: intentionally omitted
            },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        return NextResponse.json(booking);
    } catch (error: any) {
        console.error('Error fetching booking');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
