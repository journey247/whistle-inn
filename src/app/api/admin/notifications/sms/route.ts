import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Twilio from 'twilio';
import { verifyAdmin } from '@/lib/adminAuth';

export async function POST(request: Request) {
    try {
        verifyAdmin(request);
        const body = await request.json();
        const { to, message, bookingId } = body;

        if (!to || !message) {
            return NextResponse.json({ error: 'to and message required' }, { status: 400 });
        }

        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_FROM_NUMBER;

        if (!sid || !token || !from) {
            return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
        }

        const client = Twilio(sid, token);
        const msg = await client.messages.create({ from, to, body: message });

        await prisma.smsLog.create({ data: { to, body: message, type: 'outgoing', bookingId } });

        return NextResponse.json({ success: true, sid: msg.sid });
    } catch (err: any) {
        console.error('SMS send error:', err);
        return NextResponse.json({ error: err.message || 'Failed to send SMS' }, { status: 500 });
    }
}
