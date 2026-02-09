import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const bookings = await prisma.booking.findMany();
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);

        // Simple occupancy rate (assuming 365 days/year, count booked days)
        const bookedDays = bookings.reduce((sum, b) => {
            const days = Math.ceil((new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
        }, 0);
        const occupancyRate = Math.round((bookedDays / 365) * 100);

        return NextResponse.json({ totalBookings, totalRevenue, occupancyRate });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}