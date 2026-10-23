import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';
import { invalidatePricingCache } from '@/lib/pricing-server';
import { getBookableRoomBySlug, getProperty } from '@/lib/property';
import { bookableRooms } from '@/lib/property-schema';

export const dynamic = 'force-dynamic';

/**
 * Per-room pricing and capacity.
 *
 * The set of rooms is the property profile — rooms are added and removed in
 * Property setup, where they get their copy and photos. This endpoint owns
 * what changes most often: price, capacity and whether the room is on the
 * market.
 */

function unauthorized(error: unknown) {
    return error instanceof AdminAuthError;
}

/** GET — every bookable room, with its saved values or the seed defaults. */
export async function GET(request: Request) {
    try {
        await requireAdmin(request);

        const [rows, property] = await Promise.all([prisma.room.findMany(), getProperty()]);
        const bySlug = new Map(rows.map(r => [r.slug, r]));

        const rooms = bookableRooms(property).map(room => {
            const row = bySlug.get(room.slug);
            return {
                slug: room.slug,
                name: row?.name ?? room.title,
                weekdayPrice: row?.weekdayPrice ?? room.seedRate?.weekdayPrice ?? 0,
                weekendPrice: row?.weekendPrice ?? room.seedRate?.weekendPrice ?? 0,
                maxGuests: row?.maxGuests ?? room.seedRate?.maxGuests ?? 2,
                isActive: row?.isActive ?? true,
                // False means the room has no Room row yet, so these are the
                // code defaults and the room cannot be booked online.
                configured: Boolean(row),
            };
        });

        return NextResponse.json(rooms);
    } catch (error) {
        if (unauthorized(error)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Rooms fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }
}

/**
 * POST — create the Room rows for any room that does not have one yet, using
 * the seed prices from the code config. Rooms the owner added have their row
 * from the moment they are saved. Existing rows are left alone, so this is
 * safe to run more than once.
 */
export async function POST(request: Request) {
    try {
        await requireAdmin(request);

        const existing = await prisma.room.findMany({ select: { slug: true } });
        const have = new Set(existing.map(r => r.slug));
        const rooms = bookableRooms(await getProperty());
        const missing = rooms.filter(r => !have.has(r.slug) && r.seedRate);

        if (missing.length > 0) {
            await prisma.room.createMany({
                data: missing.map(room => ({
                    slug: room.slug,
                    name: room.title,
                    weekdayPrice: room.seedRate!.weekdayPrice,
                    weekendPrice: room.seedRate!.weekendPrice,
                    maxGuests: room.seedRate!.maxGuests,
                    sortOrder: rooms.indexOf(room),
                })),
            });
            invalidatePricingCache();
        }

        return NextResponse.json({ created: missing.length });
    } catch (error) {
        if (unauthorized(error)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Room seed error:', error);
        return NextResponse.json({ error: 'Failed to set up rooms' }, { status: 500 });
    }
}

/** PUT — update one room by slug, creating its row if this is the first save. */
export async function PUT(request: Request) {
    try {
        const admin = await requireAdmin(request);

        const body = await request.json();
        const { slug, weekdayPrice, weekendPrice, maxGuests, isActive, name } = body;

        const room = typeof slug === 'string' ? await getBookableRoomBySlug(slug) : undefined;
        if (!room) {
            return NextResponse.json({ error: 'Unknown room' }, { status: 400 });
        }

        // Prices are what the guest is charged, so a bad number here is a
        // pricing incident rather than a validation nit — reject, never coerce.
        const numbers: Record<string, number> = {};
        for (const [field, value] of Object.entries({ weekdayPrice, weekendPrice, maxGuests })) {
            if (value === undefined) continue;
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 0) {
                return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
            }
            numbers[field] = field === 'maxGuests' ? Math.round(parsed) : parsed;
        }

        if (numbers.maxGuests !== undefined && numbers.maxGuests < 1) {
            return NextResponse.json({ error: 'A room must sleep at least 1 guest' }, { status: 400 });
        }

        const trimmedName = typeof name === 'string' && name.trim() ? name.trim() : undefined;

        const saved = await prisma.room.upsert({
            where: { slug },
            update: {
                ...numbers,
                ...(trimmedName ? { name: trimmedName } : {}),
                ...(typeof isActive === 'boolean' ? { isActive } : {}),
            },
            create: {
                slug,
                name: trimmedName ?? room.title,
                weekdayPrice: numbers.weekdayPrice ?? room.seedRate?.weekdayPrice ?? 0,
                weekendPrice: numbers.weekendPrice ?? room.seedRate?.weekendPrice ?? 0,
                maxGuests: numbers.maxGuests ?? room.seedRate?.maxGuests ?? 2,
                isActive: typeof isActive === 'boolean' ? isActive : true,
                sortOrder: (await getProperty()).rooms.findIndex(r => r.slug === room.slug),
            },
        });

        // Quotes are served from a 5-minute cache; without this the owner would
        // watch the site keep selling at the old price after saving.
        invalidatePricingCache();

        console.log(`Room ${slug} updated by admin ${admin.email}`);

        return NextResponse.json(saved);
    } catch (error) {
        if (unauthorized(error)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Room update error:', error);
        return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }
}
