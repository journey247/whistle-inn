import { prisma } from './prisma';
import { alertOnce } from './alerts';

/**
 * Channel bookings (Airbnb/VRBO, via iCal) that overlap a direct booking.
 *
 * Checkout refuses dates an imported block already holds, but the feeds are
 * minutes-to-hours behind the channels, so a guest can book here moments
 * before Airbnb's own guest takes the same dates. Nothing can undo that
 * automatically — one of the two guests has to be moved — so the owner is
 * told at once.
 *
 * Imported blocks are always whole-property (see availability.ts), so any
 * overlap with a direct booking that still holds its dates is a conflict.
 */

export interface DirectStay {
    id: string;
    guestName: string;
    startDate: Date;
    endDate: Date;
}

export interface ChannelBlock {
    source: string;
    guestName: string;
    startDate: Date;
    endDate: Date;
}

export interface Conflict {
    key: string;
    booking: DirectStay;
    block: ChannelBlock;
}

/**
 * Whether an imported event is a real reservation rather than a calendar block.
 *
 * Airbnb exports dates it is blocking as "Not available" — and that includes
 * the dates it imported from *this* site's own calendar feed. Treating those
 * as conflicts would flag every direct booking as clashing with its own echo.
 * VRBO uses "Blocked" the same way. Only reservations ("Reserved", or a guest
 * name) are conflicts.
 */
export function isReservation(summary: string): boolean {
    return !/not available|blocked|unavailable|closed/i.test(summary);
}

/** Half-open overlap: a checkout on the 5th and a check-in on the 5th do not clash. */
function overlaps(a: { startDate: Date; endDate: Date }, b: { startDate: Date; endDate: Date }): boolean {
    return a.startDate < b.endDate && b.startDate < a.endDate;
}

export function findConflicts(bookings: DirectStay[], blocks: ChannelBlock[]): Conflict[] {
    const conflicts: Conflict[] = [];
    for (const block of blocks) {
        if (!isReservation(block.guestName)) continue;
        for (const booking of bookings) {
            if (overlaps(booking, block)) {
                conflicts.push({
                    key: `${booking.id}:${block.source}:${block.startDate.toISOString().slice(0, 10)}`,
                    booking,
                    block,
                });
            }
        }
    }
    return conflicts;
}

const day = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/**
 * Check upcoming stays against the imported blocks and alert the owner about
 * each new conflict once. Returns how many conflicts exist (alerted or not).
 */
export async function checkChannelConflicts(now: Date = new Date()): Promise<number> {
    const [bookings, blocks] = await Promise.all([
        prisma.booking.findMany({
            where: {
                endDate: { gt: now },
                OR: [{ status: 'paid' }, { status: 'pending', expiresAt: { gt: now } }],
            },
            select: { id: true, guestName: true, startDate: true, endDate: true },
        }),
        prisma.externalBooking.findMany({
            where: { endDate: { gt: now } },
            select: { source: true, guestName: true, startDate: true, endDate: true },
        }),
    ]);

    const conflicts = findConflicts(bookings, blocks);
    for (const { key, booking, block } of conflicts) {
        await alertOnce({
            key,
            type: 'booking_conflict',
            title: `Double booking: ${day(booking.startDate)} – ${day(booking.endDate)}`,
            message:
                `A ${block.source} reservation (${day(block.startDate)} – ${day(block.endDate)}) overlaps ` +
                `${booking.guestName}'s direct booking (${day(booking.startDate)} – ${day(booking.endDate)}).\n\n` +
                `One of the two stays needs to move. Check ${block.source} first; if you cancel the direct ` +
                `booking, refund it from the Reservations tab.`,
            audience: ['owner', 'ops'],
        });
    }
    return conflicts.length;
}
