import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';
import { invalidatePricingCache } from '@/lib/pricing-server';
import { BOOKABLE_ROOMS, getBookableRoomBySlug } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

/**
 * Per-room pricing and capacity.
 *
 * The set of rooms is fixed by `src/lib/rooms.ts` — rooms are not created or
 * deleted here, because each one also needs copy, photography and a page. This
 * endpoint owns what the owner actually changes: price, capacity and whether
 * the room is on the market.
 */

function unauthorized(error: unknown) {
    return error instanceof AdminAuthError;
}

/** GET — every bookable room, with its saved values or the seed defaults. */
export async function GET(request: Request) {
    try {
        await requireAdmin(request);

        const rows = await prisma.room.findMany();
        const bySlug = new Map(rows.map(r => [r.slug, r]));

        const rooms = BOOKABLE_ROOMS.map(room => {
            const row = bySlug.get(room.slug);
            return {
                slug: room.slug,
                name: row?.name ?? room.defaultTitle,
                weekdayPrice: row?.weekdayPrice ?? room.defaultWeekdayPrice,
                weekendPrice: row?.weekendPrice ?? room.defaultWeekendPrice,
                maxGuests: row?.maxGuests ?? room.defaultMaxGuests,
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
 * the seed prices from `rooms.ts`. Existing rows are left alone, so this is
 * safe to run more than once.
 */
export async function POST(request: Request) {
    try {
        await requireAdmin(request);

        const existing = await prisma.room.findMany({ select: { slug: true } });
        const have = new Set(existing.map(r => r.slug));
        const missing = BOOKABLE_ROOMS.filter(r => !have.has(r.slug));

        if (missing.length > 0) {
            await prisma.room.createMany({
                data: missing.map(room => ({
                    slug: room.slug,
                    name: room.defaultTitle,
                    weekdayPrice: room.defaultWeekdayPrice,
                    weekendPrice: room.defaultWeekendPrice,
                    maxGuests: room.defaultMaxGuests,
                    sortOrder: room.index,
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

        const staticRoom = typeof slug === 'string' ? getBookableRoomBySlug(slug) : undefined;
        if (!staticRoom) {
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

        const room = await prisma.room.upsert({
            where: { slug },
            update: {
                ...numbers,
                ...(trimmedName ? { name: trimmedName } : {}),
                ...(typeof isActive === 'boolean' ? { isActive } : {}),
            },
            create: {
                slug,
                name: trimmedName ?? staticRoom.defaultTitle,
                weekdayPrice: numbers.weekdayPrice ?? staticRoom.defaultWeekdayPrice,
                weekendPrice: numbers.weekendPrice ?? staticRoom.defaultWeekendPrice,
                maxGuests: numbers.maxGuests ?? staticRoom.defaultMaxGuests,
                isActive: typeof isActive === 'boolean' ? isActive : true,
                sortOrder: staticRoom.index,
            },
        });

        // Quotes are served from a 5-minute cache; without this the owner would
        // watch the site keep selling at the old price after saving.
        invalidatePricingCache();

        console.log(`Room ${slug} updated by admin ${admin.email}`);

        return NextResponse.json(room);
    } catch (error) {
        if (unauthorized(error)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Room update error:', error);
        return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }
}
