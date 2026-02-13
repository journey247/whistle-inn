
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const rates = await prisma.specialRate.findMany({
            orderBy: { startDate: 'asc' }
        });
        return NextResponse.json(rates);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        
        if (!body.label || !body.startDate || !body.endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const start = new Date(body.startDate);
        const end = new Date(body.endDate);

        if (start >= end) {
            return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
        }

        const rate = await prisma.specialRate.create({
            data: {
                label: body.label,
                startDate: start,
                endDate: end,
                pricePerNight: body.pricePerNight ? parseFloat(body.pricePerNight) : null,
                multiplier: body.multiplier ? parseFloat(body.multiplier) : null,
            }
        });

        return NextResponse.json(rate);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create rate' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        await prisma.specialRate.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete rate' }, { status: 500 });
    }
}
