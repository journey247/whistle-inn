import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBookableRoomBySlug } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

/**
 * GET /api/availability[?room=<slug>]
 *
 * Date ranges the booking calendar must block out.
 *
 * Without `room` this answers for the whole-property buyout, which needs the
 * house empty: every booking blocks it, including a single-room one. With
 * `room` it answers for that room only — that room's own bookings plus any
 * whole-property booking, so the other four rooms stay sellable.
 *
 * External (Airbnb/VRBO) bookings list the entire house, so they block in
 * both cases.
 */
export async function GET(request: Request) {
    try {
        const roomSlug = new URL(request.url).searchParams.get('room');

        if (roomSlug && !getBookableRoomBySlug(roomSlug)) {
            return NextResponse.json({ error: 'Unknown room' }, { status: 400 });
        }

        const room = roomSlug
            ? await prisma.room.findUnique({ where: { slug: roomSlug }, select: { id: true } })
            : null;

        const now = new Date();

        // Paid bookings always block. Pending bookings only block while they
        // haven't expired — expired pending means the guest abandoned checkout
        // and those dates are free again.
        const activeHold = [
            { status: 'paid' as const },
            { status: 'pending' as const, expiresAt: { gt: now } },
        ];

        const [siteBookings, externalBookings] = await Promise.all([
            prisma.booking.findMany({
                select: { startDate: true, endDate: true },
                where: {
                    AND: [
                        { OR: activeHold },
                        // A room query ignores other rooms' bookings. If the room
                        // has no Room row yet it can only be blocked by a buyout.
                        ...(roomSlug
                            ? [{ OR: [{ roomId: null }, ...(room ? [{ roomId: room.id }] : [])] }]
                            : []),
                    ],
                },
            }),
            prisma.externalBooking.findMany({
                select: { startDate: true, endDate: true },
            }),
        ]);

        // Combine and return all blocked date ranges
        const allBookings = [...siteBookings, ...externalBookings];
        return NextResponse.json(allBookings);
    } catch (error) {
        console.error('Error fetching availability:', error);
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
}
