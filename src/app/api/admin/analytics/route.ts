import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const bookings = await prisma.booking.findMany({
            select: {
                totalPrice: true,
                startDate: true,
                endDate: true,
                status: true,
                createdAt: true,
            }
        });

        type BookingRow = { totalPrice: number; startDate: Date; endDate: Date; status: string; createdAt: Date };

        const paidBookings = bookings.filter((b: BookingRow) => b.status === 'paid');

        const totalBookings = bookings.length;
        const totalRevenue = paidBookings.reduce((sum: number, b: BookingRow) => sum + b.totalPrice, 0);

        // Occupancy from current year only
        const daysInYear = 365;
        const bookedDays = bookings.filter((b: BookingRow) => b.status !== 'cancelled').reduce((sum: number, b: BookingRow) => {
            const start = new Date(b.startDate);
            const end = new Date(b.endDate);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
        }, 0);
        const occupancyRate = Math.min(100, Math.round((bookedDays / daysInYear) * 100));

        // Monthly revenue for last 12 months
        const now = new Date();
        const monthlyRevenue: { month: string; revenue: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            const monthLabel = d.toLocaleString('default', { month: 'short' });

            const revenue = paidBookings
                .filter((b: BookingRow) => {
                    const created = new Date(b.createdAt);
                    return created >= monthStart && created <= monthEnd;
                })
                .reduce((sum: number, b: BookingRow) => sum + b.totalPrice, 0);

            monthlyRevenue.push({ month: monthLabel, revenue });
        }

        return NextResponse.json({ totalBookings, totalRevenue, occupancyRate, monthlyRevenue });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}
