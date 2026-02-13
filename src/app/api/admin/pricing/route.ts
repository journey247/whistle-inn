import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET all special rates
export async function GET(request: Request) {
    try {
        const admin = verifyAdmin(request);

        const rates = await prisma.specialRate.findMany({
            orderBy: { startDate: 'asc' }
        });
        return NextResponse.json(rates);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
    }
}

// CREATE new special rate
export async function POST(request: Request) {
    try {
        const admin = verifyAdmin(request);

        const body = await request.json();
        const { startDate, endDate, price, minStay, note } = body;

        // Validation
        if (!startDate || !endDate || !price) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
            return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
        }

        // Check for overlap? Currently overlapping ranges allowed, more specific (e.g. later created or exact match) might win in complex logic,
        // but simple logic usually just takes the first match or average. Let's assume simple unique ranges for now.
        // For distinct ranges, `pricing-server` handles finding applicable rates.

        const rate = await prisma.specialRate.create({
            data: {
                startDate: start,
                endDate: end,
                pricePerNight: Number(price),
                label: note
            }
        });

        return NextResponse.json(rate);
    } catch (error) {
        console.error('Rate creation error:', error);
        return NextResponse.json({ error: 'Failed to create rate' }, { status: 500 });
    }
}

// DELETE special rate
export async function DELETE(request: Request) {
    try {
        const admin = verifyAdmin(request);

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        await prisma.specialRate.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete rate' }, { status: 500 });
    }
}
