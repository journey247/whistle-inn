import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCheckoutSettings } from '@/lib/checkout-settings';
import { PROPERTY_DEFAULTS } from '@/config/property';
import { getProperty } from '@/lib/property';

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

const DEFAULT_MINIMUM_NIGHTS = PROPERTY_DEFAULTS.pricingDefaults.minimumNights;
const DEFAULT_ROOM_MINIMUM_NIGHTS = PROPERTY_DEFAULTS.pricingDefaults.roomMinimumNights;

export async function GET() {
    try {
        const [blocks, property] = await Promise.all([
            prisma.contentBlock.findMany({
                where: { key: { in: ['minimum_nights', 'room_minimum_nights'] } },
                select: { key: true, value: true },
            }),
            getProperty(),
        ]);

        const byKey = Object.fromEntries(blocks.map(b => [b.key, b.value]));
        const checkout = await getCheckoutSettings();

        const minimumNights = parseInt(byKey.minimum_nights ?? '', 10);
        const roomMinimumNights = parseInt(byKey.room_minimum_nights ?? '', 10);

        return NextResponse.json({
            minimumNights: Number.isFinite(minimumNights) && minimumNights > 0
                ? minimumNights
                : DEFAULT_MINIMUM_NIGHTS,
            // The property's capacity, as advertised on the homepage and
            // gallery — the same limit checkout enforces.
            maxGuests: property.maxGuests,
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
            maxGuests: (await getProperty()).maxGuests,
            roomMinimumNights: DEFAULT_ROOM_MINIMUM_NIGHTS,
            ...(await getCheckoutSettings()),
        });
    }
}
