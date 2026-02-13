import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Booking ID is required' },
                { status: 400 }
            );
        }

        const booking = await prisma.booking.findUnique({
            where: { id },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                guestName: true,
                email: true,
                totalPrice: true,
                status: true,
                stripeSessionId: true,
                createdAt: true,
            },
        });

        if (!booking) {
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(booking);
    } catch (error: any) {
        console.error('Error fetching booking:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
