import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// One-time admin creation. Requires SETUP_KEY to match request (for safety).
export async function POST(request: Request) {
    const setupKey = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.SETUP_KEY;
    const body = await request.json();
    const { email, password, key } = body;

    if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    if (!key || key !== setupKey) return NextResponse.json({ error: 'invalid setup key' }, { status: 403 });

    try {
        const existing = await prisma.adminUser.findUnique({ where: { email } });
        if (existing) return NextResponse.json({ error: 'admin already exists' }, { status: 400 });

        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.adminUser.create({ data: { email, hashedPassword: hashed, role: 'admin' } });
        return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'failed to create admin' }, { status: 500 });
    }
}
