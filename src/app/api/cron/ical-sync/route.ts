import { NextRequest, NextResponse } from 'next/server';
import { syncAllFeeds, cancelExpiredPendingBookings } from '@/lib/ical-sync';
import { pruneRateLimits } from '@/lib/rateLimit';
import { checkChannelConflicts } from '@/lib/conflicts';
import { alertOnce, reportFailure } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/ical-sync
 *
 * Scheduled sync of all iCal feeds, plus cleanup of abandoned checkouts.
 * Protected by CRON_SECRET to prevent unauthorized calls.
 *
 * Runs every 15 minutes from .github/workflows/scheduled-sync.yml, plus the
 * daily `crons` entry in vercel.json as a fallback (the Hobby plan's limit).
 * `/api/availability` also refreshes stale feeds off real guest traffic.
 *
 * After syncing it checks for channel bookings that overlap direct ones and
 * alerts the owner (src/lib/conflicts.ts). A feed that fails is reported to
 * the owner too, since it usually means its link changed on Airbnb/VRBO.
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

        for (const r of results.filter(r => r.error)) {
            await alertOnce({
                key: `feed-failing:${r.source}`,
                type: 'system_failure',
                title: `Your ${r.source} calendar is not syncing`,
                message:
                    `The ${r.source} calendar link ("${r.feed}") could not be read, so new ${r.source} bookings ` +
                    `are not blocking dates on your website.

Error: ${r.error}

Check the link under ` +
                    `Settings → Channels; ${r.source} sometimes changes it. You will be reminded daily while it keeps failing.`,
                audience: ['owner', 'ops'],
                repeatAfterHours: 24,
            });
        }

        // Even with no feeds there may be stale blocks to compare against.
        const conflicts = await checkChannelConflicts();

        if (results.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No iCal feeds configured',
                synced: 0,
                expiredCancelled: expiredCount,
                conflicts,
            });
        }

        const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
        console.log(`[iCal Cron] Complete — ${totalSynced} total bookings synced across ${results.length} feeds`);

        return NextResponse.json({
            success: true,
            message: 'iCal sync complete',
            timestamp: new Date().toISOString(),
            expiredCancelled: expiredCount,
            conflicts,
            results,
        });
    } catch (error: any) {
        await reportFailure('iCal sync cron', error);
        return NextResponse.json({ error: 'Sync failed', details: error.message }, { status: 500 });
    }
}
