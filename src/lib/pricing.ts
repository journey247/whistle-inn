import { eachDayOfInterval } from 'date-fns';

export const PRICING = {
    WEEKDAY_NIGHT: 650, // Mon-Thu
    WEEKEND_NIGHT: 700, // Fri-Sun
    CLEANING_FEE: 150,
    MINIMUM_NIGHTS: 3,
};

export interface PriceBreakdown {
    nights: number;
    weekdayNights: number;
    weekendNights: number;
    accommodationTotal: number;
    cleaningFee: number;
    total: number;
}

export function calculatePrice(startDate: Date, endDate: Date): PriceBreakdown {
    // Determine nights (excluding check-out day)
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const nightDays = days.slice(0, -1);

    let weekdayNights = 0;
    let weekendNights = 0;

    nightDays.forEach(day => {
        const dayOfWeek = day.getDay();
        // Friday (5), Saturday (6), Sunday (0) = weekend pricing
        if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
            weekendNights++;
        } else {
            weekdayNights++;
        }
    });

    const accommodationTotal =
        (weekdayNights * PRICING.WEEKDAY_NIGHT) +
        (weekendNights * PRICING.WEEKEND_NIGHT);

    return {
        nights: nightDays.length,
        weekdayNights,
        weekendNights,
        accommodationTotal,
        cleaningFee: PRICING.CLEANING_FEE,
        total: accommodationTotal + PRICING.CLEANING_FEE
    };
}
