import { createHash } from 'crypto';
import { prisma } from './prisma';

/**
 * Fixed-window rate limiter backed by Postgres.
 *
 * Replaces an in-memory map that lived in adminAuth.ts. On Vercel every
 * function instance had its own map, so a caller spread across instances (or
 * just arriving after a cold start) got a fresh allowance each time — the
 * "5 logins per 5 minutes" limit was not a limit. One row per key, updated by a
 * single atomic upsert, gives every instance the same count.
 *
 * Keys are hashed before they are stored so the table never holds raw emails
 * or IP addresses.
 *
 * Returns true when the request is allowed. MUST be awaited: an un-awaited
 * Promise is truthy, which would silently allow everything.
 */
export async function rateLimit(identifier: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const key = createHash('sha256').update(identifier).digest('hex');
    // Prisma stores DateTime as UTC in a column without a time zone, so compare
    // against UTC rather than now() in the session's zone.
    try {
        const rows = await prisma.$queryRaw<{ count: number }[]>`
            INSERT INTO "RateLimit" ("key", "count", "windowStart")
            VALUES (${key}, 1, (now() AT TIME ZONE 'UTC'))
            ON CONFLICT ("key") DO UPDATE SET
                "count" = CASE
                    WHEN "RateLimit"."windowStart" <= (now() AT TIME ZONE 'UTC') - (${windowMs}::int * interval '1 millisecond') THEN 1
                    ELSE "RateLimit"."count" + 1
                END,
                "windowStart" = CASE
                    WHEN "RateLimit"."windowStart" <= (now() AT TIME ZONE 'UTC') - (${windowMs}::int * interval '1 millisecond') THEN (now() AT TIME ZONE 'UTC')
                    ELSE "RateLimit"."windowStart"
                END
            RETURNING "count"`;
        return Number(rows[0]?.count ?? 1) <= maxRequests;
    } catch (err) {
        // A database outage should not turn into an open door, nor lock every
        // admin out: fall back to per-instance counting until it recovers.
        console.error('[rateLimit] Shared store unavailable, using local fallback:', err);
        return localRateLimit(key, maxRequests, windowMs);
    }
}

/** Delete windows that ended long ago. Called from the daily cron. */
export async function pruneRateLimits(): Promise<number> {
    try {
        const { count } = await prisma.rateLimit.deleteMany({
            where: { windowStart: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        });
        return count;
    } catch (err) {
        console.error('[rateLimit] Prune failed:', err);
        return 0;
    }
}

// ─── Per-instance fallback ───────────────────────────────────────────────────
const localStore = new Map<string, { count: number; windowStart: number }>();
const LOCAL_MAX_KEYS = 10_000;

export function localRateLimit(key: string, maxRequests: number, windowMs: number, now = Date.now()): boolean {
    const current = localStore.get(key);
    if (!current || now - current.windowStart >= windowMs) {
        if (localStore.size >= LOCAL_MAX_KEYS) {
            for (const [k, v] of localStore) {
                if (now - v.windowStart >= windowMs) localStore.delete(k);
            }
            // Still full of live windows: drop the oldest entry.
            if (localStore.size >= LOCAL_MAX_KEYS) {
                const oldest = localStore.keys().next().value;
                if (oldest !== undefined) localStore.delete(oldest);
            }
        }
        localStore.set(key, { count: 1, windowStart: now });
        return true;
    }
    current.count++;
    return current.count <= maxRequests;
}
