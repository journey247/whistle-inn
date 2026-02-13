import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET all content blocks
export async function GET(request: Request) {
    try {
        // Verify admin token
        verifyAdmin(request);

        const blocks = await prisma.contentBlock.findMany({
            orderBy: { key: 'asc' }
        });
        return NextResponse.json(blocks);
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

// PUT (Upsert) content block
export async function PUT(request: Request) {
    try {
        verifyAdmin(request);

        const body = await request.json();

        const { key, value, label, type, section, category } = body;

        if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

        // Upsert allows creating if not exists, or updating value
        const block = await prisma.contentBlock.upsert({
            where: { key },
            update: {
                value,
                // Update metadata if provided, otherwise keep existing
                ...(label && { label }),
                ...(type && { type }),
                ...(section && { section }),
                ...(category && { category })
            },
            create: {
                key,
                value,
                label: label || key,
                type: type || 'text',
                section: section || 'Other',
                category: category || 'General'
            }
        });

        return NextResponse.json(block);
    } catch (error) {
        console.error("Content Save Error", error);
        return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
    }
}
