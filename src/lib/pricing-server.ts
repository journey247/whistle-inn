import { prisma } from '@/lib/prisma';
import { eachDayOfInterval, isWithinInterval } from 'date-fns';
import { PRICING, PriceBreakdown } from './pricing';

export interface QuoteResult extends PriceBreakdown {
    originalTotal: number;
    discountAmount: number;
    couponApplied?: string;
    appliedRates: { date: string; price: number; label: string }[];
    error?: string;
    couponId?: string;
}

export async function calculateQuote(startDate: Date|string, endDate: Date|string, couponCode?: string): Promise<QuoteResult> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 1. Fetch Special Rates (Basic overlap check)
    // Overlapping logic: (StartA <= EndB) and (EndA >= StartB)
    const specialRates = await prisma.specialRate.findMany({
        where: {
            startDate: { lte: end },
            endDate: { gte: start }
        }
    });

    // 2. Calculate Base Price (Day by Day)
    const days = eachDayOfInterval({ start, end });
    const nightDays = days.slice(0, -1); // Exclude checkout day

    let accommodationTotal = 0;
    let weekdayNights = 0;
    let weekendNights = 0;
    const appliedRates: { date: string; price: number; label: string }[] = [];

    for (const day of nightDays) {
        let price = 0;
        let label = 'Standard';
        
        // Check for special rate
        // We find the LAST matching special rate to allow overrides if multiple exist?
        // Or specific logic. Let's take the first found for now.
        const special = specialRates.find(r => 
            isWithinInterval(day, { start: r.startDate, end: r.endDate })
        );

        if (special) {
            if (special.pricePerNight !== null) {
                price = special.pricePerNight;
                label = special.label;
            } else if (special.multiplier !== null) {
                const dayOfWeek = day.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
                const base = isWeekend ? PRICING.WEEKEND_NIGHT : PRICING.WEEKDAY_NIGHT;
                price = base * special.multiplier;
                label = `${special.label} (${special.multiplier}x)`;
            }
        } else {
            const dayOfWeek = day.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
                price = PRICING.WEEKEND_NIGHT;
                label = 'Weekend';
                weekendNights++;
            } else {
                price = PRICING.WEEKDAY_NIGHT;
                label = 'Weekday';
                weekdayNights++;
            }
        }
        
        accommodationTotal += price;
        appliedRates.push({ date: day.toISOString(), price, label });
    }

    let total = accommodationTotal + PRICING.CLEANING_FEE;
    const originalTotal = total;
    let discountAmount = 0;
    let couponId: string | undefined = undefined;

    // 3. Apply Coupon
    if (couponCode) {
        const coupon = await prisma.coupon.findUnique({
            where: { code: couponCode }
        });

        if (coupon && coupon.isActive) {
            // Validate dates
            const now = new Date();
            const validFrom = !coupon.validFrom || coupon.validFrom <= now;
            const validUntil = !coupon.validUntil || coupon.validUntil >= now;
            const hasUses = coupon.maxUses === null || coupon.usedCount < coupon.maxUses;

            if (validFrom && validUntil && hasUses) {
                if (coupon.discountType === 'PERCENT') {
                    discountAmount = (accommodationTotal * coupon.value) / 100;
                } else {
                    discountAmount = coupon.value;
                }
                
                // Cap discount at total - 100 (keep small charge) or just 0
                if (discountAmount > (total)) discountAmount = total; 
                
                total -= discountAmount;
                couponId = coupon.id;
            }
        }
    }

    return {
        nights: nightDays.length,
        weekdayNights,
        weekendNights,
        accommodationTotal,
        cleaningFee: PRICING.CLEANING_FEE,
        total,
        originalTotal,
        discountAmount,
        couponApplied: couponId ? couponCode : undefined,
        couponId,
        appliedRates
    };
}
