import { NextResponse } from 'next/server';
import { calculateQuote } from '@/lib/pricing-server';

export const dynamic = 'force-dynamic';

const MAX_COUPON_LENGTH = 50;
const MAX_STAY_DAYS = 365;
// Only accept dates within the next 3 years
const MAX_FUTURE_MS = 3 * 365 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
    try {
        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { startDate, endDate, couponCode } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        if (start >= end) {
            return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
        }

        // Reject unrealistic future dates
        const now = Date.now();
        if (start.getTime() < now - 24 * 60 * 60 * 1000) {
            return NextResponse.json({ error: 'Check-in date cannot be in the past' }, { status: 400 });
        }
        if (start.getTime() > now + MAX_FUTURE_MS) {
            return NextResponse.json({ error: 'Check-in date too far in the future' }, { status: 400 });
        }

        // Reject unrealistically long stays
        const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (nights > MAX_STAY_DAYS) {
            return NextResponse.json({ error: `Maximum stay is ${MAX_STAY_DAYS} nights` }, { status: 400 });
        }

        // Sanitize coupon code: strip, limit length, alphanumeric+dash only
        let sanitizedCoupon: string | undefined;
        if (couponCode !== undefined && couponCode !== null && couponCode !== '') {
            if (typeof couponCode !== 'string') {
                return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
            }
            sanitizedCoupon = couponCode.trim().slice(0, MAX_COUPON_LENGTH);
            if (!/^[A-Za-z0-9_-]+$/.test(sanitizedCoupon)) {
                return NextResponse.json({ error: 'Invalid coupon code format' }, { status: 400 });
            }
        }

        try {
            const quote = await calculateQuote(start, end, sanitizedCoupon);
            return NextResponse.json(quote);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
