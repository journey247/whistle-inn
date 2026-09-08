import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Best-effort in-process rate limit. Per-instance on serverless, so this adds
// friction rather than a guarantee — see the shared limiter planned for later.
const requestRateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = requestRateLimit.get(ip);
    if (!entry || now > entry.resetAt) {
        requestRateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
        return false;
    }
    if (entry.count >= 10) return true;
    entry.count++;
    return false;
}

export async function POST(req: Request) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { bookingId, amenityId } = (body ?? {}) as Record<string, unknown>;

    if (typeof bookingId !== 'string' || typeof amenityId !== 'string' || !bookingId || !amenityId) {
        return NextResponse.json({ error: 'bookingId and amenityId are required' }, { status: 400 });
    }

    try {
        // Only a real, paid booking may request amenities. Without this check
        // anyone could create requests against arbitrary or invented booking IDs.
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: { id: true, status: true },
        });

        if (!booking || booking.status !== 'paid') {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        const amenity = await prisma.amenity.findUnique({
            where: { id: amenityId },
            select: { id: true },
        });

        if (!amenity) {
            return NextResponse.json({ error: 'Amenity not found' }, { status: 404 });
        }

        const created = await prisma.amenityRequest.create({
            data: { bookingId, amenityId, status: 'pending' },
            include: { amenity: true },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Amenity request error:', error);
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }
}
