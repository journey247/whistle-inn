import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const now = new Date();
        const [siteBookings, externalBookings] = await Promise.all([
            prisma.booking.findMany({
                select: { startDate: true, endDate: true },
                // Paid bookings always block. Pending bookings only block while
                // they haven't expired — expired pending means the guest abandoned
                // checkout and those dates are free again.
                where: {
                    OR: [
                        { status: 'paid' },
                        { status: 'pending', expiresAt: { gt: now } },
                    ]
                },
            }),
            prisma.externalBooking.findMany({
                select: { startDate: true, endDate: true },
            }),
        ]);

        // Combine and return all blocked date ranges
        const allBookings = [...siteBookings, ...externalBookings];
        return NextResponse.json(allBookings);
    } catch (error) {
        console.error('Error fetching availability:', error);
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
}
