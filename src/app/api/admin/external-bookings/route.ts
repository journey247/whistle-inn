import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const externalBookings = await prisma.externalBooking.findMany({ orderBy: { createdAt: "desc" } });
        return NextResponse.json(externalBookings);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { source, guestName, startDate, endDate, notes } = await request.json();
        const externalBooking = await prisma.externalBooking.create({
            data: { source, guestName, startDate: new Date(startDate), endDate: new Date(endDate), notes },
        });
        return NextResponse.json(externalBooking);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}