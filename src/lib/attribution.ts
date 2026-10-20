/**
 * Where a booking came from, so ad-driven bookings can be credited.
 *
 * A guest who lands from a tracked link (UTM parameters or a Google Ads click
 * id) gets a first-party cookie for 30 days. Checkout reads it and stores the
 * source on the booking. Paid-ad bookings are what the owner's ad fee
 * (PLATFORM_AD_FEE_PERCENT) applies to; everything else is the owner's own.
 *
 * Shared by the browser (capture) and the server (checkout), so no imports.
 */

export const ATTRIBUTION_COOKIE = 'book_src';
export const ATTRIBUTION_DAYS = 30;

export const BOOKING_SOURCES = ['direct', 'google_ads', 'meta_ads', 'paid_other', 'campaign'] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

/** Sources that came from paid advertising. */
export const PAID_SOURCES: ReadonlySet<BookingSource> = new Set(['google_ads', 'meta_ads', 'paid_other']);

export const SOURCE_LABELS: Record<BookingSource, string> = {
    direct: 'Direct / organic',
    google_ads: 'Google Ads',
    meta_ads: 'Facebook & Instagram ads',
    paid_other: 'Other paid ads',
    campaign: 'Email & other campaigns',
};

export type Attribution = {
    source: BookingSource;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
};

const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paidsocial', 'paid_social', 'paid-social', 'ads', 'ad', 'display']);
const META_SOURCES = new Set(['facebook', 'fb', 'instagram', 'ig', 'meta']);

const clip = (v: string | null | undefined) => {
    const t = v?.trim().toLowerCase().slice(0, 100);
    return t || undefined;
};

/**
 * Classify a landing URL's query string. Returns null when it carries nothing
 * trackable, so a later plain visit does not wipe an earlier ad click.
 *
 * fbclid alone is not treated as an ad: Facebook adds it to every outbound
 * link, organic posts included. Meta ads must be tagged with utm_medium=paid.
 */
export function classifyLanding(params: URLSearchParams): Attribution | null {
    const utmSource = clip(params.get('utm_source'));
    const utmMedium = clip(params.get('utm_medium'));
    const utmCampaign = clip(params.get('utm_campaign'));
    const googleClick = params.get('gclid') || params.get('gbraid') || params.get('wbraid');

    const utm = { utmSource, utmMedium, utmCampaign };

    if (googleClick) return { source: 'google_ads', ...utm };
    if (!utmSource && !utmMedium && !utmCampaign) return null;

    if (utmMedium && PAID_MEDIUMS.has(utmMedium)) {
        if (utmSource === 'google') return { source: 'google_ads', ...utm };
        if (utmSource && META_SOURCES.has(utmSource)) return { source: 'meta_ads', ...utm };
        return { source: 'paid_other', ...utm };
    }
    return { source: 'campaign', ...utm };
}

export function serializeAttribution(a: Attribution): string {
    return encodeURIComponent(JSON.stringify(a));
}

/** Parse and validate the cookie value; anything malformed counts as direct. */
export function parseAttribution(raw: string | undefined | null): Attribution {
    if (!raw) return { source: 'direct' };
    try {
        const v = JSON.parse(decodeURIComponent(raw));
        if (!v || !BOOKING_SOURCES.includes(v.source)) return { source: 'direct' };
        const str = (x: unknown) => (typeof x === 'string' ? clip(x) : undefined);
        return { source: v.source, utmSource: str(v.utmSource), utmMedium: str(v.utmMedium), utmCampaign: str(v.utmCampaign) };
    } catch {
        return { source: 'direct' };
    }
}

/** Read the attribution cookie from a request's Cookie header. */
export function attributionFromCookieHeader(header: string | null): Attribution {
    const match = header?.split(';').map(c => c.trim()).find(c => c.startsWith(`${ATTRIBUTION_COOKIE}=`));
    return parseAttribution(match?.slice(ATTRIBUTION_COOKIE.length + 1));
}

/**
 * The provider's fee on a paid-ad booking, in dollars: a percentage of rent
 * and cleaning after discounts, never of the occupancy tax.
 */
export function adFeeFor(source: string, subtotal: number, percent: number): number {
    if (!PAID_SOURCES.has(source as BookingSource)) return 0;
    if (!Number.isFinite(percent) || percent <= 0 || percent > 30) return 0;
    return Math.round(subtotal * percent) / 100;
}
