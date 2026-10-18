import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * GET /api/admin/tax-report?year=2026&quarter=4
 *
 * Occupancy tax collected on paid direct bookings, by month of check-in, in
 * the shape a quarterly TOT return asks for. Airbnb/VRBO stays are left out:
 * those channels collect and remit their own tax.
 */
export async function GET(request: Request) {
    try {
        await requireAdmin(request);

        const { searchParams } = new URL(request.url);
        const now = new Date();
        const year = parseInt(searchParams.get('year') ?? '', 10) || now.getFullYear();
        const quarter = parseInt(searchParams.get('quarter') ?? '', 10) || Math.floor(now.getMonth() / 3) + 1;
        if (quarter < 1 || quarter > 4 || year < 2000 || year > 2100) {
            return NextResponse.json({ error: 'Invalid year or quarter' }, { status: 400 });
        }

        const from = new Date(year, (quarter - 1) * 3, 1);
        const to = new Date(year, quarter * 3, 1);

        const bookings = await prisma.booking.findMany({
            where: { status: 'paid', startDate: { gte: from, lt: to } },
            select: {
                startDate: true,
                endDate: true,
                totalPrice: true,
                taxableAmount: true,
                occupancyTax: true,
                assessmentTax: true,
                taxExempt: true,
            },
            orderBy: { startDate: 'asc' },
        });

        const months = [0, 1, 2].map(i => {
            const m = new Date(year, (quarter - 1) * 3 + i, 1);
            return {
                month: m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                bookings: 0,
                nights: 0,
                grossReceipts: 0,   // what guests paid, excluding tax
                exemptReceipts: 0,  // long stays
                taxableAmount: 0,
                occupancyTax: 0,
                assessmentTax: 0,
                untaxedBookings: 0, // paid before tax collection was turned on
            };
        });

        for (const b of bookings) {
            const row = months[b.startDate.getMonth() - (quarter - 1) * 3];
            if (!row) continue;
            const tax = b.occupancyTax + b.assessmentTax;
            row.bookings++;
            row.nights += Math.round((b.endDate.getTime() - b.startDate.getTime()) / 86400000);
            row.grossReceipts += b.totalPrice - tax;
            if (b.taxExempt) row.exemptReceipts += b.totalPrice;
            else if (tax === 0) row.untaxedBookings++;
            row.taxableAmount += b.taxableAmount;
            row.occupancyTax += b.occupancyTax;
            row.assessmentTax += b.assessmentTax;
        }

        const rows = months.map(r => ({
            ...r,
            grossReceipts: cents(r.grossReceipts),
            exemptReceipts: cents(r.exemptReceipts),
            taxableAmount: cents(r.taxableAmount),
            occupancyTax: cents(r.occupancyTax),
            assessmentTax: cents(r.assessmentTax),
        }));

        const sum = (k: 'bookings' | 'nights' | 'grossReceipts' | 'exemptReceipts' | 'taxableAmount' | 'occupancyTax' | 'assessmentTax' | 'untaxedBookings') =>
            cents(rows.reduce((acc, r) => acc + r[k], 0));

        return NextResponse.json({
            year,
            quarter,
            months: rows,
            totals: {
                bookings: sum('bookings'),
                nights: sum('nights'),
                grossReceipts: sum('grossReceipts'),
                exemptReceipts: sum('exemptReceipts'),
                taxableAmount: sum('taxableAmount'),
                occupancyTax: sum('occupancyTax'),
                assessmentTax: sum('assessmentTax'),
                untaxedBookings: sum('untaxedBookings'),
            },
        });
    } catch (error) {
        if (error instanceof AdminAuthError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Tax report error:', error);
        return NextResponse.json({ error: 'Failed to build tax report' }, { status: 500 });
    }
}
