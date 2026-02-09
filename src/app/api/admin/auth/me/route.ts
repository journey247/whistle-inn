import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const auth = request.headers.get('authorization');
        if (!auth) return NextResponse.json({ user: null });

        const token = auth.replace('Bearer ', '');
        const decoded: any = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'dev-secret');

        const user = await prisma.adminUser.findUnique({ where: { id: decoded.sub } });
        if (!user) return NextResponse.json({ user: null });

        return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (err) {
        return NextResponse.json({ user: null });
    }
}
