import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const bookings = await prisma.booking.findMany({
            select: {
                startDate: true,
                endDate: true,
            },
            where: {
                status: 'paid', // Only show paid bookings as blocked? Or pending too? Ideally paid.
            },
        });

        return NextResponse.json(bookings);
    } catch (error) {
        console.error('Error fetching availability:', error);
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
}
