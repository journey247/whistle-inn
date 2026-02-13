import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        verifyAdmin(request);
        const users = await prisma.adminUser.findMany({
            select: { id: true, email: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

export async function POST(request: Request) {
    try {
        verifyAdmin(request);
        const { email, password, role } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.adminUser.create({
            data: {
                email,
                hashedPassword,
                role: role || 'admin'
            },
            select: { id: true, email: true, role: true }
        });

        return NextResponse.json(newUser);
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
