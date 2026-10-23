import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProperty } from '@/lib/property';
import { bookableRooms } from '@/lib/property-schema';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rooms
 *
 * The rooms a guest can actually book right now, with the live nightly price
 * from the Room table and the live copy from the property profile.
 *
 * A room appears here only if it has an active Room row. Falling back to the
 * seed prices in the code config would be worse than showing nothing: checkout
 * refuses a room with no row, so the guest would be offered a price they
 * cannot buy at. An empty list simply leaves the whole-house flow as it was.
 */
export async function GET() {
    try {
        const [rows, property] = await Promise.all([
            prisma.room.findMany({ where: { isActive: true } }),
            getProperty(),
        ]);

        const bySlug = new Map(rows.map(r => [r.slug, r]));

        // Driven by the profile rather than by the rows, so the order matches
        // the site and a stray row for an unknown slug cannot leak onto the page.
        const rooms = bookableRooms(property).flatMap(room => {
            const row = bySlug.get(room.slug);
            if (!row) return [];

            return [{
                slug: room.slug,
                // The Room row carries a name for the admin panel, but the
                // site's own copy wins so the room is called the same thing
                // everywhere the guest sees it.
                name: room.title,
                beds: room.beds,
                image: room.image,
                summary: room.summary,
                weekdayPrice: row.weekdayPrice,
                weekendPrice: row.weekendPrice,
                maxGuests: row.maxGuests,
            }];
        });

        return NextResponse.json(rooms);
    } catch (error) {
        console.error('Failed to load rooms:', error);
        return NextResponse.json({ error: 'Failed to load rooms' }, { status: 500 });
    }
}
