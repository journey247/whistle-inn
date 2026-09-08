import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { invalidatePricingCache } from '@/lib/pricing-server';
import { updatePricingAndStripe } from '@/lib/stripe-products';
import { notifyAdminOfChange, NotificationType } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// GET all content blocks
export async function GET(request: Request) {
    try {
        // Verify admin token
        await requireAdmin(request);

        const blocks = await prisma.contentBlock.findMany({
            orderBy: { key: 'asc' }
        });
        return NextResponse.json(blocks);
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

// PUT (Upsert) content block
export async function PUT(request: Request) {
    try {
        await requireAdmin(request);

        const body = await request.json();

        const { key, value, label, type, section, category } = body;

        if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

        // Upsert allows creating if not exists, or updating value
        const block = await prisma.contentBlock.upsert({
            where: { key },
            update: {
                value,
                // Update metadata if provided, otherwise keep existing
                ...(label && { label }),
                ...(type && { type }),
                ...(section && { section }),
                ...(category && { category })
            },
            create: {
                key,
                value,
                label: label || key,
                type: type || 'text',
                section: section || 'Other',
                category: category || 'General'
            }
        });

        // Invalidate pricing cache if base pricing was updated
        if (['base_weekday_price', 'base_weekend_price', 'cleaning_fee', 'minimum_nights'].includes(key)) {
            invalidatePricingCache();

            // Update Stripe products if cleaning fee or base rates changed
            if (key === 'cleaning_fee' || key === 'base_weekday_price' || key === 'base_weekend_price') {
                try {
                    // Determine old and new values for notification
                    let oldValue = '0';
                    let newValue = '0';

                    if (key === 'cleaning_fee') {
                        const oldBlock = await prisma.contentBlock.findUnique({ where: { key: 'cleaning_fee' } });
                        oldValue = oldBlock ? oldBlock.value : '0';
                        const cleaningBlock = await prisma.contentBlock.findUnique({ where: { key: 'cleaning_fee' } });
                        newValue = cleaningBlock ? cleaningBlock.value : '0';
                    } else if (key === 'base_weekday_price') {
                        const oldBlock = await prisma.contentBlock.findUnique({ where: { key: 'base_weekday_price' } });
                        oldValue = oldBlock ? oldBlock.value : '0';
                        const newBlock = await prisma.contentBlock.findUnique({ where: { key: 'base_weekday_price' } });
                        newValue = newBlock ? newBlock.value : '0';
                    } else if (key === 'base_weekend_price') {
                        const oldBlock = await prisma.contentBlock.findUnique({ where: { key: 'base_weekend_price' } });
                        oldValue = oldBlock ? oldBlock.value : '0';
                        const newBlock = await prisma.contentBlock.findUnique({ where: { key: 'base_weekend_price' } });
                        newValue = newBlock ? newBlock.value : '0';
                    }

                    // Send notification for pricing change (best-effort)
                    try {
                        await notifyAdminOfChange(NotificationType.ADMIN_PRICE_CHANGE, oldValue, newValue, 'Admin');
                    } catch (notificationError) {
                        console.error(`Failed to send pricing change notification:`, notificationError);
                    }

                    // Fetch current values for weekday/weekend/cleaning to update Stripe
                    const weekdayBlock = await prisma.contentBlock.findUnique({ where: { key: 'base_weekday_price' } });
                    const weekendBlock = await prisma.contentBlock.findUnique({ where: { key: 'base_weekend_price' } });
                    const cleaningBlock = await prisma.contentBlock.findUnique({ where: { key: 'cleaning_fee' } });

                    const weekdayPrice = weekdayBlock ? parseFloat(weekdayBlock.value) : 0;
                    const weekendPrice = weekendBlock ? parseFloat(weekendBlock.value) : 0;
                    const cleaningFee = cleaningBlock ? parseFloat(cleaningBlock.value) : 0;

                    // Update Stripe products asynchronously (don't block the response)
                    updatePricingAndStripe(weekdayPrice, weekendPrice, cleaningFee)
                        .then(result => {
                            if (result) {
                                console.log('Stripe pricing products updated successfully');
                            } else {
                                console.warn('Stripe update failed, but pricing cache was invalidated');
                            }
                        })
                        .catch(error => {
                            console.error('Failed to update Stripe pricing products:', error);
                        });

                } catch (error) {
                    console.error('Error triggering Stripe update:', error);
                    // Don't fail the request - pricing was still updated
                }
            }
        }

        return NextResponse.json(block);
    } catch (error) {
        console.error("Content Save Error", error);
        return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
    }
}
