import Stripe from 'stripe';

// Initialize Stripe with proper validation
function initializeStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || secretKey.includes('placeholder')) {
        throw new Error('Stripe secret key not configured');
    }
    return new Stripe(secretKey, {
        apiVersion: '2026-01-28.clover',
    });
}

let stripe: Stripe;
try {
    stripe = initializeStripe();
} catch (err) {
    console.error('Stripe initialization failed:', err);
}

export interface StripeProductInfo {
    productId: string;
    priceId: string;
    name: string;
    unitAmount: number;
}

/**
 * Creates or updates a Stripe product and its price
 */
export async function createOrUpdateStripeProduct(
    productId: string | null,
    priceId: string | null,
    name: string,
    unitAmount: number,
    description?: string
): Promise<StripeProductInfo> {
    if (!stripe) {
        throw new Error('Stripe not initialized');
    }

    try {
        let product: Stripe.Product;

        if (productId) {
            // Update existing product
            product = await stripe.products.update(productId, {
                name,
                description: description || `${name} for Whistle Inn`,
            });
        } else {
            // Create new product
            product = await stripe.products.create({
                name,
                description: description || `${name} for Whistle Inn`,
                type: 'service',
            });
        }

        let price: Stripe.Price;

        if (priceId) {
            // Update existing price (actually create new and deactivate old)
            const oldPrice = await stripe.prices.update(priceId, { active: false });

            price = await stripe.prices.create({
                product: product.id,
                unit_amount: unitAmount,
                currency: 'usd',
            });
        } else {
            // Create new price
            price = await stripe.prices.create({
                product: product.id,
                unit_amount: unitAmount,
                currency: 'usd',
            });
        }

        return {
            productId: product.id,
            priceId: price.id,
            name,
            unitAmount,
        };
    } catch (error) {
        console.error(`Failed to create/update Stripe product "${name}":`, error);
        throw error;
    }
}

/**
 * Gets product info from Stripe
 */
export async function getStripeProductInfo(productId: string): Promise<StripeProductInfo | null> {
    if (!stripe) {
        return null;
    }

    try {
        const product = await stripe.products.retrieve(productId, {
            expand: ['default_price'],
        });

        if (!product.default_price || typeof product.default_price === 'string') {
            return null;
        }

        return {
            productId: product.id,
            priceId: product.default_price.id,
            name: product.name || 'Unknown Product',
            unitAmount: product.default_price.unit_amount || 0,
        };
    } catch (error) {
        console.error(`Failed to get Stripe product ${productId}:`, error);
        return null;
    }
}

/**
 * Updates pricing in content blocks and Stripe
 * Only updates cleaning fee product since accommodation pricing is dynamic
 */
export async function updatePricingAndStripe(
    weekdayPrice: number,
    weekendPrice: number,
    cleaningFee: number
) {
    const { prisma } = await import('@/lib/prisma');

    try {
        // Get current Stripe cleaning product IDs from content blocks
        const cleaningProductBlock = await prisma.contentBlock.findUnique({
            where: { key: 'stripe_cleaning_product_id' }
        });
        const cleaningPriceBlock = await prisma.contentBlock.findUnique({
            where: { key: 'stripe_cleaning_price_id' }
        });

        // Create/update cleaning fee product
        const cleaningInfo = await createOrUpdateStripeProduct(
            cleaningProductBlock?.value || null,
            cleaningPriceBlock?.value || null,
            'Whistle Inn Cleaning Fee',
            cleaningFee,
            'One-time cleaning fee'
        );

        // Update content blocks with new Stripe IDs
        await prisma.contentBlock.upsert({
            where: { key: 'stripe_cleaning_product_id' },
            update: { value: cleaningInfo.productId },
            create: {
                key: 'stripe_cleaning_product_id',
                value: cleaningInfo.productId,
                label: 'Stripe Cleaning Product ID',
                type: 'text',
                section: 'Stripe',
                category: 'Products'
            }
        });

        await prisma.contentBlock.upsert({
            where: { key: 'stripe_cleaning_price_id' },
            update: { value: cleaningInfo.priceId },
            create: {
                key: 'stripe_cleaning_price_id',
                value: cleaningInfo.priceId,
                label: 'Stripe Cleaning Price ID',
                type: 'text',
                section: 'Stripe',
                category: 'Prices'
            }
        });

        console.log('Successfully updated Stripe cleaning fee product');
        return { cleaningInfo };

    } catch (error) {
        console.error('Failed to update Stripe pricing:', error);
        // Don't throw - we want the pricing update to succeed even if Stripe fails
        return null;
    }
}