import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const admin = verifyAdmin(request);

        const bookings = await prisma.booking.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                guestName: true,
                email: true,
                totalPrice: true,
                status: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
                stripeSessionId: true,
                // Don't select stripePaymentIntentId for security
            }
        });

        return NextResponse.json(bookings);
    } catch (error: any) {
        console.error('Bookings fetch error:', error.message);

        if (error.message.includes('token') || error.message.includes('auth')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const admin = verifyAdmin(request);

        const { id, ...updateData } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
        }

        // Validate and sanitize update data
        const allowedFields = ['notes', 'status'];
        const sanitizedData = Object.keys(updateData)
            .filter(key => allowedFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = updateData[key];
                return obj;
            }, {} as any);

        if (Object.keys(sanitizedData).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: sanitizedData
        });

        console.log(`Booking ${id} updated by admin ${admin.email}`);

        return NextResponse.json(updatedBooking);
    } catch (error: any) {
        console.error('Booking update error:', error.message);

        if (error.message.includes('token') || error.message.includes('auth')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }
}