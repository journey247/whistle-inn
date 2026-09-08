import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        await requireAdmin(request);
        const templates = await prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });
        return NextResponse.json(templates);
    } catch (err: any) {
        console.error('Email templates error:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch templates' }, { status: 401 });
    }
}

export async function POST(request: Request) {
    try {
        await requireAdmin(request);
        const body = await request.json();
        const { name, subject, body: html } = body;
        if (!name || !subject || !html) return NextResponse.json({ error: 'name, subject and body required' }, { status: 400 });
        const template = await prisma.emailTemplate.create({ data: { name, subject, body: html } });
        return NextResponse.json(template);
    } catch (err: any) {
        console.error('Create template error:', err);
        return NextResponse.json({ error: err.message || 'Failed to create template' }, { status: 500 });
    }
}
