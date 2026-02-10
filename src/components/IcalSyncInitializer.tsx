import { startIcalSyncScheduler } from '@/lib/ical-sync-scheduler';

// This component runs on the server and initializes the iCal sync scheduler
export function IcalSyncInitializer() {
    // on Vercel, we should not run this as it will hang the build and doesn't work in serverless
    if (process.env.VERCEL) {
        return null;
    }

    // Only run on server side and in production/development
    if (typeof window === 'undefined') {
        try {
            startIcalSyncScheduler();
        } catch (error) {
            console.error('Failed to start iCal sync scheduler:', error);
        }
    }

    // This component doesn't render anything
    return null;
}