/**
 * The property's starting values, before its owner edits anything.
 *
 * Each owner's site is its own deployment of this codebase, so the defaults are
 * chosen at build time by NEXT_PUBLIC_PROPERTY_ID (default: the Whistle Inn).
 *
 * The live values come from the database: owners edit the name, contact
 * details, stay rules, photos and rooms in Admin → Property setup, and pages
 * read them through getProperty() (server) or useProperty() (client). Until an
 * owner saves that profile, it is built from this file — see
 * src/lib/property-schema.ts. Only `id`, `siteUrl`, `fromEmail` and
 * `pricingDefaults` are read from here for good.
 *
 * Kept free of server-only imports so client components can use it too.
 */

import type { Room } from '@/lib/rooms';
import { whistleInn } from './properties/whistle-inn';
import { template } from './properties/template';

export type PropertyConfig = {
    id: string;
    name: string;
    /** Longer name for the footer copyright line. */
    brandLine: string;
    /** Production URL, used when NEXT_PUBLIC_BASE_URL is unset. */
    siteUrl: string;
    /** <title> of the home page. */
    title: string;
    description: string;
    roomsDescription: string;
    ogImageAlt: string;
    /** e.g. "Victorian Farmhouse" — used in image alt text. */
    propertyType: string;
    hostName: string;
    /** Guest-facing contact address. */
    email: string;
    /** Sender for system email when RESEND_FROM_EMAIL is unset. */
    fromEmail: string;
    /** Display format, e.g. "(530) 448-6242". */
    phone: string;
    /** For tel: links and structured data, e.g. "+15304486242". */
    phoneE164: string;
    address: {
        street: string;
        locality: string;
        region: string;
        postalCode: string;
        country: string;
    };
    /** Short location for copy, e.g. "Alta, California". */
    locationLabel: string;
    /** 24-hour "HH:MM". */
    checkinTime: string;
    checkoutTime: string;
    bedrooms: number;
    maxGuests: number;
    amenities: string[];
    /** Used until the owner sets their own in the admin panel. */
    pricingDefaults: {
        weekdayNight: number;
        weekendNight: number;
        cleaningFee: number;
        minimumNights: number;
        roomMinimumNights: number;
    };
    /** Refund tiers by how far ahead of check-in the guest cancels. */
    cancellation: {
        /** Full refund within this many hours of booking… */
        graceHours: number;
        /** …if check-in is at least this many days away. */
        graceMinDaysBeforeCheckIn: number;
        /** Full refund at least this many days before check-in. */
        fullRefundDays: number;
        /** Partial refund at least this many days before check-in; none after. */
        partialRefundDays: number;
        partialRefundPercent: number;
    };
    heroImages: { src: string; alt: string; attribution?: string }[];
    galleryImages: { src: string; alt: string; category: string }[];
    /** Rooms in display order; see src/lib/rooms.ts for the fields. */
    rooms: Room[];
};

const PROPERTIES: Record<string, PropertyConfig> = {
    [whistleInn.id]: whistleInn,
    [template.id]: template,
};

function resolveProperty(): PropertyConfig {
    const id = process.env.NEXT_PUBLIC_PROPERTY_ID?.trim() || whistleInn.id;
    const config = PROPERTIES[id];
    if (!config) {
        // Failing the build beats shipping one owner's site under another's name.
        throw new Error(`Unknown NEXT_PUBLIC_PROPERTY_ID "${id}". Known: ${Object.keys(PROPERTIES).join(', ')}`);
    }
    return config;
}

/** Code defaults only — read the live property with getProperty() or useProperty(). */
export const PROPERTY_DEFAULTS = resolveProperty();

/** Base URL for links in pages and emails; the env var wins so previews link to themselves. */
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || PROPERTY_DEFAULTS.siteUrl).replace(/\/+$/, '');

