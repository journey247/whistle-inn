import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/adminAuth";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        verifyAdmin(request);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const feeds = await prisma.iCalFeed.findMany();

        const results: { feed: string; synced: number; error?: string }[] = [];

        for (const feed of feeds) {
            try {
                const { parseIcalFeed } = await import("@/lib/ical-parser");
                const bookings = await parseIcalFeed(feed.url, feed.source);

                // Use upsert-style approach: fetch existing, then do a single transaction
                // that replaces only the records from this specific feed source.
                // This eliminates the race-condition window of deleteMany → create.
                await prisma.$transaction(async (tx) => {
                    // Delete existing for this source inside the transaction
                    await tx.externalBooking.deleteMany({
                        where: { source: feed.source }
                    });

                    // Re-create all bookings inside the same transaction
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

                    // Update last sync time inside transaction
                    await tx.iCalFeed.update({
                        where: { id: feed.id },
                        data: { lastSync: new Date() },
                    });
                });

                results.push({ feed: feed.name, synced: bookings.length });
            } catch (error: any) {
                console.error(`Failed to sync feed ${feed.name}:`, error);
                results.push({ feed: feed.name, synced: 0, error: error.message });
                // Continue with other feeds even if one fails
            }
        }

        return NextResponse.json({
            success: true,
            message: "Sync complete",
            results,
        });
    } catch (error) {
        console.error("Sync error:", error);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
