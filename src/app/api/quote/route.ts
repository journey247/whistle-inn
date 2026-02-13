
import { NextResponse } from 'next/server';
import { calculateQuote } from '@/lib/pricing-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { startDate, endDate, couponCode } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
            return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
        }

        try {
            const quote = await calculateQuote(start, end, couponCode);
            return NextResponse.json(quote);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
