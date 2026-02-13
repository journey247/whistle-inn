import { prisma } from './prisma';
import { differenceInCalendarDays, eachDayOfInterval, isWithinInterval } from 'date-fns';

export const PRICING = {
    WEEKDAY_NIGHT: 650, // Mon-Thu
    WEEKEND_NIGHT: 700, // Fri-Sun
    CLEANING_FEE: 150,
    MINIMUM_NIGHTS: 3,
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
    
    // Fetch special rates that overlap with the booking
    const specialRates = await prisma.specialRate.findMany({
        where: {
            OR: [
                {
                    startDate: { lte: startDate },
                    endDate: { gte: startDate }
                },
                {
                    startDate: { lte: endDate },
                    endDate: { gte: endDate }
                },
                {
                    startDate: { gte: startDate },
                    endDate: { lte: endDate }
                }
            ]
        }
    });

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
                nightlyPrice = (isWeekend ? PRICING.WEEKEND_NIGHT : PRICING.WEEKDAY_NIGHT) * specialRate.multiplier;
            }
        } else {
            nightlyPrice = isWeekend ? PRICING.WEEKEND_NIGHT : PRICING.WEEKDAY_NIGHT;
        }

        accommodationTotal += nightlyPrice;

        if (isWeekend) weekendNights++;
        else weekdayNights++;
    }

    let discountAmount = 0;
    let validCouponId: string | undefined = undefined;

    if (couponCode) {
        const coupon = await prisma.coupon.findUnique({
            where: { code: couponCode },
            include: { bookings: true } // to check usage count if needed (though count is on model)
        });

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

    const total = accommodationTotal + PRICING.CLEANING_FEE - discountAmount;

    return {
        total,
        accommodationTotal,
        cleaningFee: PRICING.CLEANING_FEE,
        nights,
        weekdayNights,
        weekendNights,
        discountAmount,
        couponId: validCouponId,
        currency: 'usd',
    };
}
