import type { PropertyConfig } from '../property';

/**
 * Starting point for a new owner's site (NEXT_PUBLIC_PROPERTY_ID=template).
 *
 * Deliberately neutral: nothing here names a real place, so a new site never
 * shows another owner's name, photos or address while its owner works through
 * Property setup. Provisioning (scripts/provision-owner.ts) saves the owner's
 * name and contact details over this before the site goes up, and the site is
 * kept out of search results until setup is finished.
 */
export const template: PropertyConfig = {
    id: 'template',
    name: 'Your Property',
    brandLine: 'Your Property',
    // NEXT_PUBLIC_BASE_URL, set by provisioning, takes precedence.
    siteUrl: 'https://example.com',
    title: 'Your Property — Book Direct',
    description: 'Book your stay directly with the owner.',
    roomsDescription: 'The rooms and spaces at this property.',
    ogImageAlt: 'The property',
    propertyType: 'Vacation Rental',
    hostName: 'Your Host',
    email: 'owner@example.com',
    // RESEND_FROM_EMAIL, set by provisioning, takes precedence.
    fromEmail: 'noreply@example.com',
    phone: '(555) 555-0100',
    phoneE164: '+15555550100',
    address: {
        street: 'Street address',
        locality: 'City',
        region: 'CA',
        postalCode: '00000',
        country: 'US',
    },
    locationLabel: 'Your town',
    checkinTime: '16:00',
    checkoutTime: '11:00',
    bedrooms: 1,
    maxGuests: 2,
    amenities: [],

    // Placeholders only; each owner sets their own in Settings → Pricing.
    pricingDefaults: {
        weekdayNight: 200,
        weekendNight: 250,
        cleaningFee: 100,
        minimumNights: 2,
        roomMinimumNights: 2,
    },

    // A common "moderate" policy; owners change it in Property setup.
    cancellation: {
        graceHours: 24,
        graceMinDaysBeforeCheckIn: 7,
        fullRefundDays: 5,
        partialRefundDays: 1,
        partialRefundPercent: 50,
    },

    heroImages: [{ src: '/properties/template/hero.png', alt: 'Photo coming soon' }],
    galleryImages: [],
    // Owners add their rooms in Property setup; each gets its own page then.
    rooms: [],
};
