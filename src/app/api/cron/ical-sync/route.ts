import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/ical-sync
 *
 * Vercel Cron Job endpoint — syncs all iCal feeds every 30 minutes.
 * Protected by CRON_SECRET to prevent unauthorized calls.
 *
 * Configure in vercel.json crons array with schedule "* /30 * * * *" (every 30 min).
 * Vercel automatically sends the Authorization: Bearer CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
    // Verify the request is from Vercel Cron (or authorized caller)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[iCal Cron] Unauthorized cron request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const feeds = await prisma.iCalFeed.findMany();

        if (feeds.length === 0) {
            return NextResponse.json({ success: true, message: 'No iCal feeds configured', synced: 0 });
        }

        const results: { feed: string; synced: number; error?: string }[] = [];

        for (const feed of feeds) {
            try {
                const { parseIcalFeed } = await import('@/lib/ical-parser');
                const bookings = await parseIcalFeed(feed.url, feed.source);

                // Atomic delete + re-create inside a transaction to eliminate
                // the race-condition window where dates appear available mid-sync.
                await prisma.$transaction(async (tx) => {
                    await tx.externalBooking.deleteMany({
                        where: { source: feed.source }
                    });

                    if (bookings.length > 0) {
                        await tx.externalBooking.createMany({
                            data: bookings.map((booking) => ({
                                source: feed.source,
                                guestName: booking.guestName,
                                startDate: new Date(booking.startDate),
                                endDate: new Date(booking.endDate),
                                notes: `Imported from ${feed.name} iCal feed`,
                            })),
                        });
                    }

                    await tx.iCalFeed.update({
                        where: { id: feed.id },
                        data: { lastSync: new Date() },
                    });
                });

                results.push({ feed: feed.name, synced: bookings.length });
                console.log(`[iCal Cron] Synced ${bookings.length} bookings from "${feed.name}"`);
            } catch (error: any) {
                console.error(`[iCal Cron] Failed to sync feed "${feed.name}":`, error.message);
                results.push({ feed: feed.name, synced: 0, error: error.message });
            }
        }

        const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
        console.log(`[iCal Cron] Complete — ${totalSynced} total bookings synced across ${feeds.length} feeds`);

        return NextResponse.json({
            success: true,
            message: 'iCal sync complete',
            timestamp: new Date().toISOString(),
            results,
        });
    } catch (error: any) {
        console.error('[iCal Cron] Fatal sync error:', error);
        return NextResponse.json({ error: 'Sync failed', details: error.message }, { status: 500 });
    }
}
