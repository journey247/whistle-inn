import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

// Prevent caching for admin data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        verifyAdmin(request);

        const [bookings, externalBookings] = await Promise.all([
            prisma.booking.findMany({
                where: {
                    status: { not: 'cancelled' },
                },
                select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    guestName: true,
                    status: true,
                    notes: true,
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
                title: b.guestName,
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
