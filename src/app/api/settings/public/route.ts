import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
const DEFAULT_MAX_GUESTS = 10;

export async function GET() {
    try {
        const blocks = await prisma.contentBlock.findMany({
            where: { key: { in: ['minimum_nights', 'max_guests'] } },
            select: { key: true, value: true },
        });

        const byKey = Object.fromEntries(blocks.map(b => [b.key, b.value]));

        const minimumNights = parseInt(byKey.minimum_nights ?? '', 10);
        const maxGuests = parseInt(byKey.max_guests ?? '', 10);

        return NextResponse.json({
            minimumNights: Number.isFinite(minimumNights) && minimumNights > 0
                ? minimumNights
                : DEFAULT_MINIMUM_NIGHTS,
            maxGuests: Number.isFinite(maxGuests) && maxGuests > 0
                ? maxGuests
                : DEFAULT_MAX_GUESTS,
        });
    } catch (error) {
        console.error('Failed to load public settings:', error);
        // Never fail the booking modal over this — serve safe defaults.
        return NextResponse.json({
            minimumNights: DEFAULT_MINIMUM_NIGHTS,
            maxGuests: DEFAULT_MAX_GUESTS,
        });
    }
}
