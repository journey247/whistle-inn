import { NextRequest, NextResponse } from 'next/server';
import { syncAllFeeds, cancelExpiredPendingBookings } from '@/lib/ical-sync';
import { pruneRateLimits } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/ical-sync
 *
 * Scheduled sync of all iCal feeds, plus cleanup of abandoned checkouts.
 * Protected by CRON_SECRET to prevent unauthorized calls.
 *
 * Driven by the `crons` entry in vercel.json, which on the Hobby plan can only
 * fire once a day. Any external scheduler that can send an
 * `Authorization: Bearer <CRON_SECRET>` header can call this more often, and
 * `/api/availability` also refreshes stale feeds off real guest traffic.
 */
export async function GET(request: NextRequest) {
    // Verify the request is from Vercel Cron (or authorized caller)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('[iCal Cron] CRON_SECRET env var not configured — endpoint is locked');
        return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[iCal Cron] Unauthorized cron request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cleanup runs first and unconditionally: it used to sit after the
    // `feeds.length === 0` early return, so a property with no iCal feeds
    // configured never had its abandoned checkouts cleaned up, leaving stale
    // 'pending' rows cluttering the admin Reservations list indefinitely.
    const expiredCount = await cancelExpiredPendingBookings();
    await pruneRateLimits();

    try {
        const results = await syncAllFeeds();

        if (results.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No iCal feeds configured',
                synced: 0,
                expiredCancelled: expiredCount,
            });
        }

        const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
        console.log(`[iCal Cron] Complete — ${totalSynced} total bookings synced across ${results.length} feeds`);

        return NextResponse.json({
            success: true,
            message: 'iCal sync complete',
            timestamp: new Date().toISOString(),
            expiredCancelled: expiredCount,
            results,
        });
    } catch (error: any) {
        console.error('[iCal Cron] Fatal sync error:', error);
        return NextResponse.json({ error: 'Sync failed', details: error.message }, { status: 500 });
    }
}
