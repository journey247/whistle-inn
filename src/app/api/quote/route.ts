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

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
        }
        
        if (start >= end) {
             return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
        }

        const quote = await calculateQuote(start, end, couponCode);

        // Filter out sensitive data if any (though calculateQuote is pretty clean)
        return NextResponse.json(quote);
    } catch (error) {
        console.error('Quote error:', error);
        return NextResponse.json({ error: 'Failed to calculate quote' }, { status: 500 });
    }
}
