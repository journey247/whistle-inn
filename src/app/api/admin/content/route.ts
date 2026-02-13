import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        verifyAdmin(request);
        const content = await prisma.contentBlock.findMany({
            orderBy: { key: 'asc' }
        });
        return NextResponse.json(content);
    } catch (error: any) {
        if (error.message === 'Authentication failed' || error.message === 'Invalid token' || error.message.includes('Missing or invalid authorization')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Failed to fetch content:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        verifyAdmin(request);
        const body = await request.json();
        const { key, value, label, section } = body;

        if (!key || value === undefined) {
            return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
        }

        const updated = await prisma.contentBlock.update({
            where: { key },
            data: {
                value,
                ...(label && { label }),
                ...(section && { section })
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        if (error.message === 'Authentication failed' || error.message === 'Invalid token' || error.message.includes('Missing or invalid authorization')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Failed to update content:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
