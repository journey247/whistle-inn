import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch all confirmed bookings
        const bookings = await prisma.booking.findMany({
            where: {
                status: 'paid',
            },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                guestName: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        const formatDate = (date: Date) => format(date, 'yyyyMMdd');
        const formatDateTime = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'");

        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Whistle Inn//Website Booking System//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
        ].join('\r\n');

        bookings.forEach(booking => {
            // Check-in dates usually start at 3pm, Check-out at 11am
            // But iCal usually treats full day blocks for availability. 
            // Most OTA engines use DTSTART;VALUE=DATE.
            const start = formatDate(booking.startDate);
            const end = formatDate(booking.endDate);
            const now = formatDateTime(new Date());
            const created = formatDateTime(booking.createdAt);
            const lastMod = formatDateTime(booking.updatedAt);

            // Mask guest details for privacy if needed, but 'Reserved' is standard
            const summary = 'Reserved (Whistle Inn)';

            const event = [
                'BEGIN:VEVENT',
                `UID:${booking.id}@whistleinn.com`,
                `DTSTAMP:${now}`,
                `DTSTART;VALUE=DATE:${start}`,
                `DTEND;VALUE=DATE:${end}`,
                `SUMMARY:${summary}`,
                `DESCRIPTION:Direct booking from website.`,
                `CREATED:${created}`,
                `LAST-MODIFIED:${lastMod}`,
                'STATUS:CONFIRMED',
                'END:VEVENT'
            ].join('\r\n');

            icsContent += '\r\n' + event;
        });

        icsContent += '\r\nEND:VCALENDAR';

        return new Response(icsContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'attachment; filename="whistle-inn-bookings.ics"',
                'Cache-Control': 'no-store, max-age=0',
            },
        });

    } catch (error) {
        console.error('Error generating iCal:', error);
        return NextResponse.json({ error: 'Failed to generate calendar' }, { status: 500 });
    }
}
