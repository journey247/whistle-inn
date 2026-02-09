import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
    try {
        verifyAdmin(request);
        const logs = await prisma.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
        return NextResponse.json(logs);
    } catch (err: any) {
        console.error('Email logs error:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch email logs' }, { status: 401 });
    }
}
