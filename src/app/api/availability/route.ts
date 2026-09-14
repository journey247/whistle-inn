import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBookableRoomBySlug } from '@/lib/rooms';
import { syncStaleFeeds } from '@/lib/ical-sync';

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
 *
 * This endpoint also refreshes stale channel feeds, after the response — see
 * `refreshChannelsInBackground` below.
 */

/**
 * Pull the Airbnb/VRBO feeds when they have gone stale, on the back of real
 * guest traffic.
 *
 * The scheduled job runs once a day (Vercel's Hobby plan does not allow more),
 * which leaves a long window where a channel booking is invisible here. This
 * closes it where it actually costs money: someone opening the booking
 * calendar is the moment before a double-booking becomes possible, so that is
 * the moment worth spending a fetch on.
 *
 * `after()` runs this once the response has been sent, so the guest waits on
 * nothing. It cannot be the only trigger — no visitors means no refresh — so
 * it complements the cron job rather than replacing it.
 */
function refreshChannelsInBackground() {
    after(async () => {
        try {
            // Returns immediately when nothing is stale, and claims each feed
            // atomically so simultaneous visitors don't all fetch at once.
            await syncStaleFeeds();
        } catch (error) {
            // Never surface this: the guest already has their answer, and a
            // channel being unreachable is not their problem.
            console.error('[availability] Background channel refresh failed:', error);
        }
    });
}

export async function GET(request: Request) {
    try {
        refreshChannelsInBackground();

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
