import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16' as any,
});

function verifyAuth(request: Request) {
    const auth = request.headers.get('authorization');
    if (!auth) throw new Error('Unauthorized');
    const token = auth.replace('Bearer ', '');
    const decoded: any = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'dev-secret');
    return decoded;
}

export async function GET(request: Request) {
    try {
        verifyAuth(request);
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        if (!id) return NextResponse.json({ error: 'Booking id required' }, { status: 400 });

        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(booking);
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message || 'Failed to fetch booking' }, { status: 401 });
    }
}

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function renderTemplate(template: string, vars: Record<string, string | number | undefined>) {
    let result = template;
    for (const key of Object.keys(vars || {})) {
        const re = new RegExp(`{{\s*${key}\s*}}`, 'g');
        result = result.replace(re, String(vars[key] ?? ''));
    }
    return result;
}

export async function PATCH(request: Request) {
    try {
        verifyAuth(request);
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        if (!id) return NextResponse.json({ error: 'Booking id required' }, { status: 400 });

        const body = await request.json();
        const { status, notes } = body;

        // Handle refunds for cancellations
        if (status === 'cancelled') {
            const existing = await prisma.booking.findUnique({ where: { id } });
            if (existing?.status === 'paid' && existing.stripePaymentIntentId) {
                try {
                    const isMock = (process.env.STRIPE_SECRET_KEY || 'placeholder').includes('placeholder');
                    if (isMock) {
                        console.log('Skipping Stripe refund (mock/placeholder key active)');
                    } else {
                        await stripe.refunds.create({ payment_intent: existing.stripePaymentIntentId });
                    }

                    // Log email notification (sending handled below or here?)
                    // The existing code sends 'booking_confirmation' template for 'paid'.
                    // We might want to send a cancellation email too.
                    try {
                        await resend.emails.send({
                            from: process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL || 'noreply@thewhistleinn.com',
                            to: existing.email,
                            subject: 'Your booking has been cancelled',
                            html: `<p>Your booking for ${new Date(existing.startDate).toLocaleDateString()} has been cancelled and refunded.</p>`
                        });
                    } catch (emailErr) {
                        console.error('Failed to send cancellation email', emailErr);
                    }

                } catch (e: any) {
                    console.error('Refund failed:', e);
                }
            }
        }

        const update = await prisma.booking.update({
            where: { id },
            data: { status, notes },
        });

        // If booking marked as paid, send confirmation email using template
        if (status === 'paid') {
            try {
                const booking = await prisma.booking.findUnique({ where: { id } });
                if (booking) {
                    const template = await prisma.emailTemplate.findUnique({ where: { name: 'booking_confirmation' } });
                    if (template) {
                        const vars = {
                            guestName: booking.guestName,
                            startDate: new Date(booking.startDate).toLocaleDateString(),
                            endDate: new Date(booking.endDate).toLocaleDateString(),
                            bookingId: booking.id,
                        };

                        const html = renderTemplate(template.body, vars);
                        const subject = renderTemplate(template.subject, vars);
                        const from = process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL || 'noreply@thewhistleinn.com';
                        await resend.emails.send({ from, to: booking.email, subject, html });
                        await prisma.emailLog.create({ data: { to: booking.email, subject, body: html, template: 'booking_confirmation', bookingId: booking.id } });
                    }
                }
            } catch (e) {
                console.error('Failed sending confirmation email after marking paid', e);
            }
        }

        return NextResponse.json(update);
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message || 'Failed to update booking' }, { status: 401 });
    }
}
