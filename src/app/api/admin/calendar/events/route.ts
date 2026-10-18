import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

// Prevent caching for admin data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        await requireAdmin(request);

        const [bookings, externalBookings] = await Promise.all([
            prisma.booking.findMany({
                where: {
                    // Requests hold no dates until approved.
                    status: { notIn: ['cancelled', 'requested'] },
                },
                select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    guestName: true,
                    status: true,
                    notes: true,
                    room: { select: { slug: true, name: true } },
                }
            }),
            prisma.externalBooking.findMany({
                select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    guestName: true,
                    source: true,
                    notes: true,
                }
            })
        ]);

        const events = [
            ...bookings.map(b => ({
                id: b.id,
                type: 'internal',
                // A room booking leaves the other rooms free, so the room has
                // to be visible on the calendar or the owner cannot tell a
                // single-room night from a full buyout.
                title: b.room ? `${b.guestName} — ${b.room.name}` : b.guestName,
                room: b.room?.name ?? null,
                roomSlug: b.room?.slug ?? null,
                start: b.startDate,
                end: b.endDate,
                status: b.status,
                notes: b.notes,
                source: 'Whistle Inn'
            })),
            ...externalBookings.map(b => ({
                id: b.id,
                type: b.source === 'Blocked' ? 'blocked' : 'external',
                title: b.guestName,
                start: b.startDate,
                end: b.endDate,
                status: 'confirmed',
                notes: b.notes,
                source: b.source
            }))
        ];

        return NextResponse.json(events);
    } catch (error) {
        console.error('Calendar events error:', error);
        return NextResponse.json({ error: 'Unauthorized or Error' }, { status: 401 });
    }
}
