import { NextRequest, NextResponse } from 'next/server';
import { sendDueFollowups } from '@/lib/followups';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/guest-followups
 *
 * Daily: send the post-stay thank-you / return-offer email to guests who
 * checked out yesterday (see src/lib/followups.ts). Does nothing unless the
 * owner has turned follow-ups on. Protected by CRON_SECRET like the iCal cron.
 */
export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error('[Follow-up Cron] CRON_SECRET env var not configured — endpoint is locked');
        return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
    }
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await sendDueFollowups();
        console.log('[Follow-up Cron]', result);
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('[Follow-up Cron] Failed:', error);
        return NextResponse.json({ error: 'Follow-up run failed' }, { status: 500 });
    }
}
