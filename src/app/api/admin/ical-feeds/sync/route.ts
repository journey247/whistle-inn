import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const feeds = await prisma.iCalFeed.findMany();

        for (const feed of feeds) {
            try {
                // Import dynamically to avoid build issues
                const { parseIcalFeed } = await import("@/lib/ical-parser");
                const bookings = await parseIcalFeed(feed.url, feed.source);

                // Clear existing bookings for this feed source
                await prisma.externalBooking.deleteMany({
                    where: { source: feed.source }
                });

                // Add new bookings
                for (const booking of bookings) {
                    await prisma.externalBooking.create({
                        data: {
                            source: feed.source,
                            guestName: booking.guestName,
                            startDate: new Date(booking.startDate),
                            endDate: new Date(booking.endDate),
                            notes: `Imported from ${feed.name} iCal feed`,
                        },
                    });
                }

                // Update last sync time
                await prisma.iCalFeed.update({
                    where: { id: feed.id },
                    data: { lastSync: new Date() },
                });

            } catch (error) {
                console.error(`Failed to sync feed ${feed.name}:`, error);
                // Continue with other feeds even if one fails
            }
        }

        return NextResponse.json({ success: true, message: "All feeds synced successfully" });
    } catch (error) {
        console.error("Sync error:", error);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}