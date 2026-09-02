import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        verifyAdmin(request);
        const requests = await prisma.amenityRequest.findMany({
            include: { amenity: true, booking: { select: { id: true, guestName: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(requests);
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
