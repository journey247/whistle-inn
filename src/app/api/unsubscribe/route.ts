import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribe } from '@/lib/followups';

export const dynamic = 'force-dynamic';

/**
 * POST /api/unsubscribe  { e: email, t: token }
 *
 * Opt a guest out of marketing email. The token is an HMAC of the address, so
 * a link only works for the inbox it was sent to. A POST (from the page's
 * button) rather than the link itself, so mail scanners that prefetch links
 * don't unsubscribe people by accident.
 */
export async function POST(request: Request) {
    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const email = typeof body?.e === 'string' ? body.e.trim().toLowerCase() : '';
    const token = typeof body?.t === 'string' ? body.t.trim() : '';

    if (!verifyUnsubscribe(email, token)) {
        return NextResponse.json({ error: 'This unsubscribe link is not valid.' }, { status: 400 });
    }

    await prisma.emailOptOut.upsert({ where: { email }, update: {}, create: { email } });
    return NextResponse.json({ success: true });
}
