import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/adminAuth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        verifyAdmin(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        verifyAdmin(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { source, guestName, startDate, endDate, notes } = await request.json();

        if (!source || !guestName || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        if (start >= end) {
            return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
        }

        const externalBooking = await prisma.externalBooking.create({
            data: { source, guestName, startDate: start, endDate: end, notes },
        });
        return NextResponse.json(externalBooking);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        verifyAdmin(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        await prisma.externalBooking.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}
