
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(coupons);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        
        // Basic validation
        if (!body.code || !body.discountType || !body.discountValue) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: body.code.toUpperCase(),
                discountType: body.discountType,
                value: parseFloat(body.discountValue), // Maps from input 'discountValue' to DB 'value'
                validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
                validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
                maxUses: body.maxUses ? parseInt(body.maxUses) : null,
                isActive: body.isActive ?? true,
            }
        });

        return NextResponse.json(coupon);
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        await prisma.coupon.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { id, ...data } = body;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const updated = await prisma.coupon.update({
            where: { id },
            data: {
                ...data,
                validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
                validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
            }
        });
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
    }
}
