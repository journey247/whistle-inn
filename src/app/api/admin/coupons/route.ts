import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';
import { invalidatePricingCache } from '@/lib/pricing-server';

export const dynamic = 'force-dynamic';

// GET all coupons
export async function GET(request: Request) {
    try {
        const admin = verifyAdmin(request);

        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(coupons);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
    }
}

// CREATE new coupon
export async function POST(request: Request) {
    try {
        const admin = verifyAdmin(request);

        const body = await request.json();
        const { code, discountType, discountValue, active, expiresAt, maxUses } = body;

        // Basic validation
        if (!code || !discountType || !discountValue) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                discountType,
                value: Number(discountValue),
                isActive: active ?? true,
                validUntil: expiresAt ? new Date(expiresAt) : null,
                maxUses: maxUses ? Number(maxUses) : null,
                usedCount: 0
            }
        });

        // Invalidate cache to ensure real-time pricing updates
        invalidatePricingCache();

        return NextResponse.json(coupon);
    } catch (error) {
        console.error('Coupon creation error:', error);
        return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
    }
}

// DELETE coupon
export async function DELETE(request: Request) {
    try {
        const admin = verifyAdmin(request);

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        await prisma.coupon.delete({
            where: { id }
        });

        // Invalidate cache to ensure real-time pricing updates
        invalidatePricingCache();

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
    }
}
