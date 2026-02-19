import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [siteBookings, externalBookings] = await Promise.all([
            prisma.booking.findMany({
                select: { startDate: true, endDate: true },
                // Include both paid AND pending — pending blocks the calendar so
                // two guests cannot select the same dates simultaneously.
                where: { status: { in: ['paid', 'pending'] } },
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
