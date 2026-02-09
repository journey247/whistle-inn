import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
    const { email, password } = await request.json();

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    try {
        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

        const match = await bcrypt.compare(password, user.hashedPassword);
        if (!match) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

        const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.NEXTAUTH_SECRET || 'dev-secret', { expiresIn: '7d' });

        return NextResponse.json({ token });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
