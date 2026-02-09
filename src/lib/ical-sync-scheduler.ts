import * as cron from 'node-cron';
import { prisma } from '@/lib/prisma';

let syncJob: cron.ScheduledTask | null = null;

export function startIcalSyncScheduler() {
    if (syncJob) {
        console.log('iCal sync scheduler already running');
        return;
    }

    // Run every 30 minutes: '*/30 * * * *'
    syncJob = cron.schedule('*/30 * * * *', async () => {
        console.log('Starting scheduled iCal feed sync...');

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
                                notes: `Auto-synced from ${feed.name} iCal feed`,
                            },
                        });
                    }

                    // Update last sync time
                    await prisma.iCalFeed.update({
                        where: { id: feed.id },
                        data: { lastSync: new Date() },
                    });

                    console.log(`Successfully synced ${feed.name}`);

                } catch (error) {
                    console.error(`Failed to sync feed ${feed.name}:`, error);
                    // Continue with other feeds even if one fails
                }
            }

            console.log('Scheduled iCal feed sync completed');

        } catch (error) {
            console.error('Scheduled sync error:', error);
        }
    });

    // Start the job
    syncJob.start();
    console.log('iCal sync scheduler started - will run every 30 minutes');
}

export function stopIcalSyncScheduler() {
    if (syncJob) {
        syncJob.stop();
        syncJob = null;
        console.log('iCal sync scheduler stopped');
    }
}

export function getSchedulerStatus() {
    return {
        isRunning: syncJob !== null,
        nextRun: null // node-cron doesn't expose next run time
    };
}