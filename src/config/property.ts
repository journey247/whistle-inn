/**
 * Who this site is for: the property's name, contact details and address.
 *
 * Each owner's site is its own deployment of this codebase, so the property is
 * chosen at build time by NEXT_PUBLIC_PROPERTY_ID (default: the Whistle Inn).
 * Adding an owner means adding a file under ./properties and registering it
 * below — no other code should name a property directly.
 *
 * Values that owners change themselves (prices, room copy, the booking contact
 * shown in the modal) live in the database and the admin panel instead; this
 * file holds what is fixed when the site is set up.
 *
 * Kept free of server-only imports so client components can use it too.
 */

import { whistleInn } from './properties/whistle-inn';

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
};

const PROPERTIES: Record<string, PropertyConfig> = {
    [whistleInn.id]: whistleInn,
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

export const PROPERTY = resolveProperty();

/** Base URL for links in pages and emails; the env var wins so previews link to themselves. */
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || PROPERTY.siteUrl).replace(/\/+$/, '');

/** "33800 Alta Bonny Nook Rd, Alta, CA 95701" */
export function formatAddress(a: PropertyConfig['address'] = PROPERTY.address): string {
    return `${a.street}, ${a.locality}, ${a.region} ${a.postalCode}`;
}
