import { prisma } from './prisma';
import { differenceInCalendarDays, eachDayOfInterval, isWithinInterval } from 'date-fns';

// Cache for pricing data to enable real-time invalidation
interface PricingCache {
    specialRates: any[];
    coupons: any[];
    lastUpdated: number;
}

let pricingCache: PricingCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache invalidation function - call this when admin makes changes
export function invalidatePricingCache() {
    pricingCache = null;
}

// Get cached pricing data with automatic refresh
async function getPricingData() {
    const now = Date.now();

    if (pricingCache && (now - pricingCache.lastUpdated) < CACHE_TTL) {
        return pricingCache;
    }

    // Fetch fresh data from database
    const [specialRates, coupons] = await Promise.all([
        prisma.specialRate.findMany({
            orderBy: { createdAt: 'desc' }
        }),
        prisma.coupon.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    pricingCache = {
        specialRates,
        coupons,
        lastUpdated: now
    };

    return pricingCache;
}

// Get base pricing from content management system
async function getBasePricing() {
    try {
        const weekdayBlock = await prisma.contentBlock.findUnique({
            where: { key: 'base_weekday_price' }
        });
        const weekendBlock = await prisma.contentBlock.findUnique({
            where: { key: 'base_weekend_price' }
        });
        const cleaningBlock = await prisma.contentBlock.findUnique({
            where: { key: 'cleaning_fee' }
        });
        const minNightsBlock = await prisma.contentBlock.findUnique({
            where: { key: 'minimum_nights' }
        });

        return {
            WEEKDAY_NIGHT: weekdayBlock ? parseFloat(weekdayBlock.value) : 650,
            WEEKEND_NIGHT: weekendBlock ? parseFloat(weekendBlock.value) : 700,
            CLEANING_FEE: cleaningBlock ? parseFloat(cleaningBlock.value) : 150,
            MINIMUM_NIGHTS: minNightsBlock ? parseInt(minNightsBlock.value) : 3,
        };
    } catch (error) {
        // Fallback to hardcoded values if content blocks don't exist
        return {
            WEEKDAY_NIGHT: 650,
            WEEKEND_NIGHT: 700,
            CLEANING_FEE: 150,
            MINIMUM_NIGHTS: 3,
        };
    }
}

export const PRICING = {
    WEEKDAY_NIGHT: 650, // Mon-Thu - will be overridden by content blocks
    WEEKEND_NIGHT: 700, // Fri-Sun - will be overridden by content blocks
    CLEANING_FEE: 150, // will be overridden by content blocks
    MINIMUM_NIGHTS: 3, // will be overridden by content blocks
};

export interface PriceBreakdown {
    total: number;
    accommodationTotal: number;
    cleaningFee: number;
    nights: number;
    weekdayNights: number;
    weekendNights: number;
    discountAmount: number;
    couponId?: string;
    currency: string;
}

export async function calculateQuote(
    startDate: Date,
    endDate: Date,
    couponCode?: string
): Promise<PriceBreakdown> {
    const nights = differenceInCalendarDays(endDate, startDate);

    // Get cached pricing data and base pricing
    const [pricingData, basePricing] = await Promise.all([
        getPricingData(),
        getBasePricing()
    ]);

    // Filter special rates that overlap with the booking
    const specialRates = pricingData.specialRates.filter(rate =>
        rate.startDate <= endDate && rate.endDate >= startDate
    );

    const days = eachDayOfInterval({ start: startDate, end: new Date(endDate.getTime() - 86400000) });
    let accommodationTotal = 0;
    let weekdayNights = 0;
    let weekendNights = 0;

    for (const day of days) {
        // Check for special rate override
        const specialRate = specialRates.find(rate =>
            isWithinInterval(day, { start: rate.startDate, end: rate.endDate })
        );

        let nightlyPrice = 0;
        const dayOfWeek = day.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek >= 5; // Fri, Sat, Sun

        if (specialRate) {
            if (specialRate.pricePerNight) {
                nightlyPrice = specialRate.pricePerNight;
            } else if (specialRate.multiplier) {
                nightlyPrice = (isWeekend ? basePricing.WEEKEND_NIGHT : basePricing.WEEKDAY_NIGHT) * specialRate.multiplier;
            }
        } else {
            nightlyPrice = isWeekend ? basePricing.WEEKEND_NIGHT : basePricing.WEEKDAY_NIGHT;
        }

        accommodationTotal += nightlyPrice;

        if (isWeekend) weekendNights++;
        else weekdayNights++;
    }

    let discountAmount = 0;
    let validCouponId: string | undefined = undefined;

    if (couponCode) {
        const coupon = pricingData.coupons.find(c => c.code === couponCode);

        if (coupon && coupon.isActive) {
            const now = new Date();
            if (
                (!coupon.validFrom || coupon.validFrom <= now) &&
                (!coupon.validUntil || coupon.validUntil >= now) &&
                (!coupon.maxUses || coupon.usedCount < coupon.maxUses)
            ) {
                if (coupon.discountType === 'PERCENT') {
                    discountAmount = accommodationTotal * (coupon.value / 100);
                } else if (coupon.discountType === 'FIXED') {
                    discountAmount = coupon.value;
                }
                validCouponId = coupon.id;
            } else {
                throw new Error("Invalid or expired coupon");
            }
        } else {
            throw new Error("Invalid or expired coupon");
        }
    }

    // Cap discount at accommodation total
    discountAmount = Math.min(discountAmount, accommodationTotal);

    const total = accommodationTotal + basePricing.CLEANING_FEE - discountAmount;

    return {
        total,
        accommodationTotal,
        cleaningFee: basePricing.CLEANING_FEE,
        nights,
        weekdayNights,
        weekendNights,
        discountAmount,
        couponId: validCouponId,
        currency: 'usd',
    };
}
