import { prisma } from './prisma';
import { parseIcalFeed } from './ical-parser';

/**
 * Importing the Airbnb/VRBO iCal feeds.
 *
 * This is the only place a feed is applied to the database. The cron job, the
 * admin "sync now" button, the in-process scheduler and the traffic-triggered
 * refresh all come through here, so the safety checks below cannot be bypassed
 * by whichever entry point happens to run.
 */

/**
 * How old a feed may get before a guest visit triggers a refresh.
 *
 * Vercel's Hobby plan caps cron at once per day, so the scheduled job alone
 * leaves a long window where a channel booking is invisible to this site.
 */
export const DEFAULT_MAX_AGE_MINUTES = (() => {
    const parsed = parseInt(process.env.ICAL_SYNC_MAX_AGE_MINUTES ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
})();

export type FeedSyncResult = {
    feed: string;
    source: string;
    synced: number;
    /** Set when the sync deliberately did nothing. */
    skipped?: 'empty-feed' | 'claimed-elsewhere';
    error?: string;
};

/**
 * Raised when a feed parses to zero events while we still hold future blocks
 * for it — see the guard in `applyFeed`.
 */
class EmptyFeedError extends Error {
    constructor(source: string, held: number) {
        super(`Feed "${source}" returned no events while ${held} future block(s) are held — refusing to clear`);
        this.name = 'EmptyFeedError';
    }
}

/**
 * Replace this feed's blocks with what the feed currently says.
 *
 * The replace is a delete + recreate inside one transaction, so the dates are
 * never momentarily free to a concurrent checkout.
 *
 * The guard matters more than it looks: `parseIcalFeed` returns `[]` rather
 * than throwing when it cannot make sense of the response, so an Airbnb format
 * change or an error page served with a 200 would otherwise delete every block
 * for that source and quietly put those dates back on sale. Refusing an empty
 * result while future blocks are held keeps the stale (safe) data instead.
 *
 * A feed that is genuinely empty because every stay is in the past still
 * clears, since only future-dated blocks count toward the guard.
 */
async function applyFeed(feed: { id: string; name: string; url: string; source: string }): Promise<number> {
    const bookings = await parseIcalFeed(feed.url, feed.source);

    await prisma.$transaction(async (tx) => {
        if (bookings.length === 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const heldFutureBlocks = await tx.externalBooking.count({
                where: { source: feed.source, endDate: { gte: today } },
            });

            if (heldFutureBlocks > 0) {
                throw new EmptyFeedError(feed.source, heldFutureBlocks);
            }
        }

        await tx.externalBooking.deleteMany({ where: { source: feed.source } });

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

    return bookings.length;
}

function toResult(feed: { name: string; source: string }, error: unknown): FeedSyncResult {
    if (error instanceof EmptyFeedError) {
        console.warn(`[iCal] ${error.message}`);
        return { feed: feed.name, source: feed.source, synced: 0, skipped: 'empty-feed' };
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[iCal] Failed to sync feed "${feed.name}":`, message);
    return { feed: feed.name, source: feed.source, synced: 0, error: message };
}

/** Sync every configured feed, regardless of how recently it last ran. */
export async function syncAllFeeds(): Promise<FeedSyncResult[]> {
    const feeds = await prisma.iCalFeed.findMany();
    const results: FeedSyncResult[] = [];

    for (const feed of feeds) {
        try {
            const synced = await applyFeed(feed);
            results.push({ feed: feed.name, source: feed.source, synced });
            console.log(`[iCal] Synced ${synced} booking(s) from "${feed.name}"`);
        } catch (error) {
            // One bad feed must not stop the others.
            results.push(toResult(feed, error));
        }
    }

    return results;
}

/**
 * Sync only the feeds that have gone stale.
 *
 * Safe to call from concurrent requests. Each feed is claimed with a
 * conditional update, so of two instances racing on the same feed only one
 * wins and the other skips rather than both fetching and rewriting the same
 * rows. A failed sync restores the previous `lastSync`, so the claim cannot
 * leave a broken feed looking fresh until the next interval.
 */
export async function syncStaleFeeds(
    maxAgeMinutes: number = DEFAULT_MAX_AGE_MINUTES
): Promise<FeedSyncResult[]> {
    const staleBefore = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const isStale = { OR: [{ lastSync: null }, { lastSync: { lt: staleBefore } }] };

    const candidates = await prisma.iCalFeed.findMany({ where: isStale });
    if (candidates.length === 0) return [];

    const results: FeedSyncResult[] = [];

    for (const feed of candidates) {
        const previousSync = feed.lastSync;

        const claim = await prisma.iCalFeed.updateMany({
            where: { id: feed.id, ...isStale },
            data: { lastSync: new Date() },
        });

        if (claim.count === 0) {
            // Another instance got there first between the read and the claim.
            results.push({ feed: feed.name, source: feed.source, synced: 0, skipped: 'claimed-elsewhere' });
            continue;
        }

        try {
            const synced = await applyFeed(feed);
            results.push({ feed: feed.name, source: feed.source, synced });
            console.log(`[iCal] Refreshed ${synced} booking(s) from "${feed.name}" (stale > ${maxAgeMinutes}m)`);
        } catch (error) {
            await prisma.iCalFeed
                .updateMany({ where: { id: feed.id }, data: { lastSync: previousSync } })
                .catch(() => { /* best effort: the next run retries anyway */ });
            results.push(toResult(feed, error));
        }
    }

    return results;
}

/** Cancel pending bookings whose checkout window has expired. */
export async function cancelExpiredPendingBookings(): Promise<number> {
    try {
        const expired = await prisma.booking.updateMany({
            where: { status: 'pending', expiresAt: { lt: new Date() } },
            data: { status: 'cancelled' },
        });
        if (expired.count > 0) {
            console.log(`[iCal] Cancelled ${expired.count} expired pending booking(s)`);
        }
        return expired.count;
    } catch (error) {
        console.error('[iCal] Expired-pending cleanup failed:', error);
        return 0;
    }
}
