import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEmail, getClientIp } from "@/lib/adminAuth";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // Rate limit by IP
    const ip = getClientIp(req);
    if (!(await rateLimit(`subscribe:${ip}`, 5, 60_000))) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let email: unknown;
    try {
        ({ email } = await req.json());
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!email || typeof email !== 'string') {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate format + length
    if (!validateEmail(email)) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    try {
        await prisma.subscriber.upsert({
            where: { email: email.trim().toLowerCase() },
            create: { email: email.trim().toLowerCase() },
            update: {}, // already subscribed — silently succeed
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Subscription error');
        return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
    }
}
