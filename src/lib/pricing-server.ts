import { prisma } from './prisma';
import { differenceInCalendarDays, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { getBookableRoomBySlug } from './rooms';

// Cache for pricing data to enable real-time invalidation
interface PricingCache {
    specialRates: any[];
    coupons: any[];
    rooms: any[];
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
    const [specialRates, coupons, rooms] = await Promise.all([
        prisma.specialRate.findMany({
            orderBy: { createdAt: 'desc' }
        }),
        prisma.coupon.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.room.findMany({
            orderBy: { sortOrder: 'asc' }
        })
    ]);

    pricingCache = {
        specialRates,
        coupons,
        rooms,
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
        const roomMinNightsBlock = await prisma.contentBlock.findUnique({
            where: { key: 'room_minimum_nights' }
        });

        return {
            WEEKDAY_NIGHT: weekdayBlock ? parseFloat(weekdayBlock.value) : 650,
            WEEKEND_NIGHT: weekendBlock ? parseFloat(weekendBlock.value) : 700,
            CLEANING_FEE: cleaningBlock ? parseFloat(cleaningBlock.value) : 150,
            MINIMUM_NIGHTS: minNightsBlock ? parseInt(minNightsBlock.value) : 3,
            ROOM_MINIMUM_NIGHTS: roomMinNightsBlock ? parseInt(roomMinNightsBlock.value) : 2,
        };
    } catch (error) {
        // Fallback to hardcoded values if content blocks don't exist
        return {
            WEEKDAY_NIGHT: 650,
            WEEKEND_NIGHT: 700,
            CLEANING_FEE: 150,
            MINIMUM_NIGHTS: 3,
            ROOM_MINIMUM_NIGHTS: 2,
        };
    }
}

export const PRICING = {
    WEEKDAY_NIGHT: 650, // Mon-Thu - will be overridden by content blocks
    WEEKEND_NIGHT: 700, // Fri-Sun - will be overridden by content blocks
    CLEANING_FEE: 150, // will be overridden by content blocks
    MINIMUM_NIGHTS: 3, // will be overridden by content blocks
    ROOM_MINIMUM_NIGHTS: 2, // single-room stays; will be overridden by content blocks
};

/** Booking constraints that go with a quote, so callers need not re-read them. */
export interface QuoteConstraints {
    minimumNights: number;
    /** 0 means "no room-specific cap" — the property-wide max_guests applies. */
    maxGuests: number;
}

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
    /** Null for a whole-property booking. */
    roomId: string | null;
    roomSlug: string | null;
    roomName: string | null;
    constraints: QuoteConstraints;
}

export interface QuoteOptions {
    couponCode?: string;
    /** Omit (or pass null) to quote the whole property, as before. */
    roomSlug?: string | null;
}

/**
 * Resolve a bookable room by slug.
 *
 * The Room row is authoritative for price, capacity and whether the room is on
 * the market. The static list in `rooms.ts` is consulted only for its seed
 * prices, so a database that has not been seeded yet still returns a quote
 * instead of failing the guest at checkout.
 */
async function resolveRoomPricing(roomSlug: string) {
    const staticRoom = getBookableRoomBySlug(roomSlug);
    if (!staticRoom) {
        throw new Error('Unknown room');
    }

    const { rooms } = await getPricingData();
    const dbRoom = rooms.find(r => r.slug === roomSlug);

    if (dbRoom && !dbRoom.isActive) {
        throw new Error('That room is not currently available to book');
    }

    return {
        id: (dbRoom?.id as string | undefined) ?? null,
        slug: roomSlug,
        name: (dbRoom?.name as string | undefined) ?? staticRoom.defaultTitle,
        weekdayPrice: dbRoom ? Number(dbRoom.weekdayPrice) : staticRoom.defaultWeekdayPrice,
        weekendPrice: dbRoom ? Number(dbRoom.weekendPrice) : staticRoom.defaultWeekendPrice,
        maxGuests: dbRoom ? Number(dbRoom.maxGuests) : staticRoom.defaultMaxGuests,
    };
}

export async function calculateQuote(
    startDate: Date,
    endDate: Date,
    options: QuoteOptions | string = {}
): Promise<PriceBreakdown> {
    // This used to take `couponCode` as a third positional argument.
    const opts: QuoteOptions = typeof options === 'string' ? { couponCode: options } : options;
    const { couponCode, roomSlug } = opts;

    const nights = differenceInCalendarDays(endDate, startDate);

    // Get cached pricing data and base pricing
    const [pricingData, basePricing] = await Promise.all([
        getPricingData(),
        getBasePricing()
    ]);

    const room = roomSlug ? await resolveRoomPricing(roomSlug) : null;

    const weekdayRate = room ? room.weekdayPrice : basePricing.WEEKDAY_NIGHT;
    const weekendRate = room ? room.weekendPrice : basePricing.WEEKEND_NIGHT;

    // Filter special rates that overlap with the booking, then narrow by scope.
    // A property-wide rate with a fixed pricePerNight is a whole-house price, so
    // it must not be charged for a single room — only its multiplier carries
    // over. A rate attached to this room always wins over a property-wide one.
    const overlapping = pricingData.specialRates.filter(rate =>
        rate.startDate <= endDate && rate.endDate >= startDate
    );
    const propertyRates = overlapping.filter(rate => !rate.roomId);
    const roomRates = room?.id
        ? overlapping.filter(rate => rate.roomId === room.id)
        : [];

    const days = eachDayOfInterval({ start: startDate, end: new Date(endDate.getTime() - 86400000) });
    let accommodationTotal = 0;
    let weekdayNights = 0;
    let weekendNights = 0;

    for (const day of days) {
        const covers = (rate: any) => isWithinInterval(day, { start: rate.startDate, end: rate.endDate });
        const roomRate = roomRates.find(covers);
        const propertyRate = propertyRates.find(covers);

        const dayOfWeek = day.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek >= 5; // Fri, Sat, Sun
        const baseNightly = isWeekend ? weekendRate : weekdayRate;

        let nightlyPrice = baseNightly;

        if (roomRate) {
            if (roomRate.pricePerNight) {
                nightlyPrice = roomRate.pricePerNight;
            } else if (roomRate.multiplier) {
                nightlyPrice = baseNightly * roomRate.multiplier;
            }
        } else if (propertyRate) {
            if (room) {
                // Only the relative part of a property-wide rate reaches a room.
                if (propertyRate.multiplier) {
                    nightlyPrice = baseNightly * propertyRate.multiplier;
                }
            } else if (propertyRate.pricePerNight) {
                nightlyPrice = propertyRate.pricePerNight;
            } else if (propertyRate.multiplier) {
                nightlyPrice = baseNightly * propertyRate.multiplier;
            }
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

    // The cleaning fee is charged once per booking, whether the guest takes one
    // room or the whole house — it is the same turnover either way.
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
        roomId: room?.id ?? null,
        roomSlug: room?.slug ?? null,
        roomName: room?.name ?? null,
        constraints: {
            minimumNights: room ? basePricing.ROOM_MINIMUM_NIGHTS : basePricing.MINIMUM_NIGHTS,
            maxGuests: room ? room.maxGuests : 0,
        },
    };
}
