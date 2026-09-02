import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const body = await req.json();
    const { bookingId, amenityId } = body;
    if (!bookingId || !amenityId) {
        return NextResponse.json({ error: 'bookingId and amenityId are required' }, { status: 400 });
    }
    const request = await prisma.amenityRequest.create({
        data: { bookingId, amenityId, status: 'pending' },
        include: { amenity: true }
    });
    return NextResponse.json(request, { status: 201 });
}
