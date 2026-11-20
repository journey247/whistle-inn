import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { syncAllFeeds } from "@/lib/ical-sync";
import { checkChannelConflicts } from "@/lib/conflicts";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/ical-feeds/sync
 *
 * The admin panel's "sync now" button. Forces every feed to refresh regardless
 * of how recently it ran, which is the point of pressing it.
 */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin(request);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const results = await syncAllFeeds();
        const conflicts = await checkChannelConflicts();

        return NextResponse.json({
            success: true,
            message: "Sync complete",
            conflicts,
            results,
        });
    } catch (error) {
        console.error("Sync error:", error);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
