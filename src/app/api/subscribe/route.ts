import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEmail } from "@/lib/adminAuth";

export const dynamic = 'force-dynamic';

// Basic in-process rate limiter (best-effort on serverless — adds friction without relying on it)
const subscribeRateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = subscribeRateLimit.get(ip);
    if (!entry || now > entry.resetAt) {
        subscribeRateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
        return false;
    }
    if (entry.count >= 5) return true;
    entry.count++;
    return false;
}

export async function POST(req: NextRequest) {
    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isRateLimited(ip)) {
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
