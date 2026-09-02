import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
    try {
        verifyAdmin(request);
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        if (!id) return NextResponse.json({ error: 'Request id required' }, { status: 400 });

        const body = await request.json();
        const { status } = body;
        const updated = await prisma.amenityRequest.update({ where: { id }, data: { status } });
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
