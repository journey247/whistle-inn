import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/adminAuth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Subscriber emails are personal data — admin only.
    try {
        verifyAdmin(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const subscribers = await prisma.subscriber.findMany({ orderBy: { createdAt: "desc" } });
        return NextResponse.json(subscribers);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}
