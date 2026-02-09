import { NextResponse } from 'next/server';
import { startIcalSyncScheduler, getSchedulerStatus } from '@/lib/ical-sync-scheduler';

export async function POST() {
    try {
        startIcalSyncScheduler();
        const status = getSchedulerStatus();
        return NextResponse.json({
            success: true,
            message: 'iCal sync scheduler started',
            status
        });
    } catch (error) {
        console.error('Failed to start scheduler:', error);
        return NextResponse.json({
            error: 'Failed to start scheduler'
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const status = getSchedulerStatus();
        return NextResponse.json({ status });
    } catch (error) {
        console.error('Failed to get scheduler status:', error);
        return NextResponse.json({
            error: 'Failed to get scheduler status'
        }, { status: 500 });
    }
}