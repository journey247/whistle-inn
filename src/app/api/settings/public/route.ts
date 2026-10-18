import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCheckoutSettings } from '@/lib/checkout-settings';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/public
 *
 * Guest-safe booking constraints for the booking modal.
 *
 * This exists because the modal previously read `minimum_nights` from
 * /api/admin/content, which requires an admin token. Guests always got a 401,
 * so the modal silently fell back to a hardcoded 3 — meaning the owner could
 * change the minimum in the admin panel and the calendar would ignore it,
 * either blocking valid stays or letting guests fill the whole form before the
 * server rejected them.
 *
 * Only expose values that are safe for anyone to read.
 */

const DEFAULT_MINIMUM_NIGHTS = 3;
// 14 is the property's actual capacity, as advertised on the homepage stats and
// the gallery. There is no `max_guests` content block seeded or editable from
// the admin panel, so in practice this fallback is the live value — it must
// match what the site advertises or large groups are rejected at checkout.
const DEFAULT_MAX_GUESTS = 14;
// A single room is a far smaller commitment than the whole house, so it carries
// its own (shorter) minimum. Holding one bedroom to a 3-night minimum turns away
// the midweek one-nighters that per-room booking exists to capture.
const DEFAULT_ROOM_MINIMUM_NIGHTS = 2;

export async function GET() {
    try {
        const blocks = await prisma.contentBlock.findMany({
            where: { key: { in: ['minimum_nights', 'max_guests', 'room_minimum_nights'] } },
            select: { key: true, value: true },
        });

        const byKey = Object.fromEntries(blocks.map(b => [b.key, b.value]));
        const checkout = await getCheckoutSettings();

        const minimumNights = parseInt(byKey.minimum_nights ?? '', 10);
        const maxGuests = parseInt(byKey.max_guests ?? '', 10);
        const roomMinimumNights = parseInt(byKey.room_minimum_nights ?? '', 10);

        return NextResponse.json({
            minimumNights: Number.isFinite(minimumNights) && minimumNights > 0
                ? minimumNights
                : DEFAULT_MINIMUM_NIGHTS,
            maxGuests: Number.isFinite(maxGuests) && maxGuests > 0
                ? maxGuests
                : DEFAULT_MAX_GUESTS,
            roomMinimumNights: Number.isFinite(roomMinimumNights) && roomMinimumNights > 0
                ? roomMinimumNights
                : DEFAULT_ROOM_MINIMUM_NIGHTS,
            ...checkout,
        });
    } catch (error) {
        console.error('Failed to load public settings:', error);
        // Never fail the booking modal over this — serve safe defaults.
        return NextResponse.json({
            minimumNights: DEFAULT_MINIMUM_NIGHTS,
            maxGuests: DEFAULT_MAX_GUESTS,
            roomMinimumNights: DEFAULT_ROOM_MINIMUM_NIGHTS,
            ...(await getCheckoutSettings()),
        });
    }
}
