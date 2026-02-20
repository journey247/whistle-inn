import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const auth = request.headers.get('authorization');
        if (!auth || !auth.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = auth.replace('Bearer ', '');
        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const decoded: any = jwt.verify(token, secret);

        const user = await prisma.adminUser.findUnique({ where: { id: decoded.sub } });
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (err) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
