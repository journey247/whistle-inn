import { NextResponse } from 'next/server';
import { startIcalSyncScheduler, getSchedulerStatus } from '@/lib/ical-sync-scheduler';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        await requireAdmin(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

export async function GET(request: Request) {
    try {
        await requireAdmin(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
