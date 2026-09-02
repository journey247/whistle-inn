import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const amenities = await prisma.amenity.findMany({ where: { available: true } });
    return NextResponse.json(amenities);
}
