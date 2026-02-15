import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';
import { invalidatePricingCache } from '@/lib/pricing-server';
import { updatePricingAndStripe } from '@/lib/stripe-products';
import { notifyAdminOfChange, NotificationType } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// GET all content blocks
export async function GET(request: Request) {
    try {
        // Verify admin token
        verifyAdmin(request);

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
        verifyAdmin(request);

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

            // Update Stripe products if cleaning fee changed
            if (key === 'cleaning_fee') {
                try {
                    // Get old value for notification
                    const oldBlock = await prisma.contentBlock.findUnique({
                        where: { key: 'cleaning_fee' }
                    });
                    const oldValue = oldBlock ? oldBlock.value : '0';

                    // Get current cleaning fee value
                    const cleaningBlock = await prisma.contentBlock.findUnique({
                        where: { key: 'cleaning_fee' }
                    });

                    const cleaningFee = cleaningBlock ? parseFloat(cleaningBlock.value) : 150;

                    // Send notification for pricing change
                    try {
                        await notifyAdminOfChange(NotificationType.ADMIN_PRICE_CHANGE, oldValue, cleaningBlock?.value || '150', 'Admin');
                    } catch (notificationError) {
                        console.error(`Failed to send pricing change notification:`, notificationError);
                        // Continue - don't fail the update because notification failed
                    }

                    // Update Stripe cleaning fee product asynchronously (don't block the response)
                    updatePricingAndStripe(0, 0, cleaningFee) // Only cleaning fee matters for Stripe
                        .then(result => {
                            if (result) {
                                console.log('Stripe cleaning fee product updated successfully');
                            } else {
                                console.warn('Stripe update failed, but pricing cache was invalidated');
                            }
                        })
                        .catch(error => {
                            console.error('Failed to update Stripe cleaning fee product:', error);
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
