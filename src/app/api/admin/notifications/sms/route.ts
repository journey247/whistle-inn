import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { sendSMS } from '@/lib/sms';

export const dynamic = 'force-dynamic';

// Twilio removed: this endpoint will record the outgoing SMS in the DB and
// return success but will not send via any external provider.
export async function POST(request: Request) {
    try {
        await requireAdmin(request);
        const body = await request.json();
        const { to, message, bookingId } = body;

        if (!to || !message) {
            return NextResponse.json({ error: 'to and message required' }, { status: 400 });
        }

        // Log the SMS in the database
        await prisma.smsLog.create({ data: { to, body: message, type: 'outgoing', bookingId } });

        // No-op send (kept for API contract) — logs a message but does not call Twilio
        await sendSMS({ to, message });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('SMS send error:', err);
        return NextResponse.json({ error: err.message || 'Failed to send SMS' }, { status: 500 });
    }
}
