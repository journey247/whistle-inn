import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export async function DELETE(request: Request) {
    try {
        verifyAdmin(request);
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        await prisma.emailTemplate.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Delete template error:', err);
        return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 });
    }
}
