import * as cron from 'node-cron';
import { syncAllFeeds } from './ical-sync';

/**
 * In-process scheduler for self-hosted / local runs.
 *
 * Deliberately not used on Vercel — serverless functions do not stay warm, so
 * a node-cron timer registered during a request dies with that invocation
 * (see IcalSyncInitializer, which skips this when process.env.VERCEL is set).
 * On Vercel the schedule comes from vercel.json's cron entry, from any external
 * caller of /api/cron/ical-sync, and from the stale-feed refresh that
 * /api/availability runs off real traffic.
 */

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
            // Shared with every other entry point, so the empty-feed guard and
            // the transactional replace apply here too.
            await syncAllFeeds();
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
