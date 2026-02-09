import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

function verifyAuth(request: Request) {
    const auth = request.headers.get('authorization');
    if (!auth) throw new Error('Unauthorized');
    const token = auth.replace('Bearer ', '');
    const decoded: any = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'dev-secret');
    return decoded;
}

export async function GET(request: Request) {
    try {
        verifyAuth(request as any);
        const bookings = await prisma.booking.findMany({ orderBy: { createdAt: "desc" } });
        return NextResponse.json(bookings);
    } catch (error: any) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message || 'Database connection failed' }, { status: 401 });
    }
}