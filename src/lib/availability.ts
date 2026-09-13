import type { Prisma } from '@prisma/client';

/**
 * Conflict rules for a property that sells both the whole house and single rooms.
 *
 * A booking with `roomId: null` is a whole-property buyout. It occupies every
 * room, so it conflicts with any other booking over the same dates. A booking
 * with a `roomId` only conflicts with that same room — and with any buyout.
 *
 * External bookings (the Airbnb/VRBO iCal feeds) are always whole-property:
 * those channels list the entire house, so an imported reservation blocks every
 * room. If a per-room channel is ever added, that assumption has to change here.
 */

/** Bookings that still hold their dates: paid, or pending and not yet expired. */
function activeHold(now: Date): Prisma.BookingWhereInput {
    return {
        OR: [
            { status: 'paid' },
            { status: 'pending', expiresAt: { gt: now } },
        ],
    };
}

/**
 * Bookings that conflict with [start, end) for the given room.
 *
 * @param roomId `null` for a whole-property booking, which collides with everything.
 */
export function conflictingBookingWhere(
    start: Date,
    end: Date,
    roomId: string | null,
    now: Date = new Date()
): Prisma.BookingWhereInput {
    // Half-open interval: a checkout on the 5th does not conflict with a
    // check-in on the 5th, which is why this is lt/gt rather than lte/gte.
    const overlaps: Prisma.BookingWhereInput[] = [
        { startDate: { lt: end } },
        { endDate: { gt: start } },
        activeHold(now),
    ];

    if (roomId !== null) {
        // A room booking is blocked by the same room, or by a buyout.
        overlaps.push({ OR: [{ roomId: null }, { roomId }] });
    }

    return { AND: overlaps };
}

/** External (channel) bookings that conflict with [start, end). Always whole-property. */
export function conflictingExternalWhere(start: Date, end: Date): Prisma.ExternalBookingWhereInput {
    return {
        AND: [
            { startDate: { lt: end } },
            { endDate: { gt: start } },
        ],
    };
}
