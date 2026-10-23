import { z } from 'zod';
import type { PropertyConfig } from '@/config/property';
import type { BookableRoom, Room as ConfigRoom } from '@/lib/rooms';

/**
 * The property as the owner edits it, and how it becomes what the site shows.
 *
 * `PropertyProfile` is the document stored in the PropertyProfile table: the
 * name, contact details, stay rules, permits, photos and rooms. Until an owner
 * saves it for the first time there is no row, and the profile is built from
 * the code config (src/config/properties/) plus any room copy already edited
 * in ContentBlock — so the live site looks the same before and after the
 * first save.
 *
 * What stays in code, per deployment: the property id, the production URL,
 * the email sender (its domain needs DNS set up) and the fallback prices.
 *
 * Kept free of server-only imports so the admin wizard can validate with the
 * same schema the API uses.
 */

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const ROOM_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (max: number) => z.string().trim().min(1, 'Required').max(max);
const optionalText = (max: number) => z.string().trim().max(max).default('');
const count = (min: number, max: number) => z.number().int().min(min).max(max);

/**
 * Hosts next.config.js lets next/image load from. Any other host would break
 * the page's images, so links elsewhere are refused rather than saved.
 */
const IMAGE_HOSTS = [/\.public\.blob\.vercel-storage\.com$/, /^images\.unsplash\.com$/];

export function isAllowedImageSrc(v: string): boolean {
    if (v.startsWith('/')) return !v.startsWith('//') && !/\s/.test(v);
    try {
        const url = new URL(v);
        return url.protocol === 'https:' && IMAGE_HOSTS.some(h => h.test(url.hostname));
    } catch {
        return false;
    }
}

/** A site path ("/pool.webp") or an uploaded photo's URL. */
const imageSrc = z
    .string()
    .trim()
    .max(500)
    .refine(isAllowedImageSrc, 'Upload the photo, or use a /path to one already on the site');

/** "(530) 448-6242" → "+15304486242". US numbers may omit the country code. */
export function toE164(phone: string): string | null {
    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, '');
    if (trimmed.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return null;
}

/** "Garden Room" → "garden-room". Room slugs are fixed once created, so links never break. */
export function slugify(title: string): string {
    return title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/, '');
}

export const heroImageSchema = z.object({
    src: imageSrc,
    alt: text(200),
    attribution: z.string().trim().max(200).optional(),
});

export const galleryImageSchema = z.object({
    src: imageSrc,
    alt: text(200),
    category: text(60),
});

export const profileRoomSchema = z.object({
    slug: z.string().max(60).regex(ROOM_SLUG_RE, 'Lowercase letters, numbers and dashes'),
    /** False for a space shown on the site but not sold on its own. */
    bookable: z.boolean(),
    title: text(80),
    beds: text(80),
    image: imageSrc,
    /** One or two sentences, for cards and meta descriptions. */
    summary: text(400),
    /** Long-form copy for the room's page; the summary stands in when empty. */
    description: optionalText(5000),
    /** A JPEG for social previews; the site's default image when unset. */
    ogImage: imageSrc.optional(),
});

export const cancellationSchema = z
    .object({
        graceHours: count(0, 168),
        graceMinDaysBeforeCheckIn: count(0, 365),
        fullRefundDays: count(0, 365),
        partialRefundDays: count(0, 365),
        partialRefundPercent: count(0, 100),
    })
    .refine(c => c.partialRefundDays <= c.fullRefundDays, {
        message: 'The partial-refund window must start no earlier than the full-refund one',
        path: ['partialRefundDays'],
    });

export const profileSchema = z.object({
    name: text(80),
    /** Longer name for the footer copyright line. */
    brandLine: text(120),
    /** <title> of the home page. */
    title: text(120),
    description: text(400),
    roomsDescription: text(400),
    ogImageAlt: text(200),
    /** e.g. "Victorian Farmhouse" — used in image alt text. */
    propertyType: text(60),
    hostName: text(80),
    email: z.string().trim().email('Enter a valid email').max(200),
    phone: text(30).refine(v => toE164(v) !== null, 'Enter a phone number with its area code'),
    address: z.object({
        street: text(120),
        locality: text(80),
        region: text(40),
        postalCode: text(20),
        country: z.string().trim().length(2, 'Two-letter country code').transform(v => v.toUpperCase()),
    }),
    /** Short location for copy, e.g. "Alta, California". */
    locationLabel: text(80),
    checkinTime: z.string().regex(TIME_RE, 'Use 24-hour HH:MM'),
    checkoutTime: z.string().regex(TIME_RE, 'Use 24-hour HH:MM'),
    bedrooms: count(0, 100),
    maxGuests: count(1, 500),
    amenities: z.array(text(60)).max(50),
    cancellation: cancellationSchema,
    /** Required by the county before taking bookings; shown to guests once set. */
    permits: z.object({
        strPermit: optionalText(80),
        totCertificate: optionalText(80),
        businessLicense: optionalText(80),
    }),
    heroImages: z.array(heroImageSchema).min(1, 'Add at least one photo').max(20),
    galleryImages: z.array(galleryImageSchema).max(200),
    rooms: z
        .array(profileRoomSchema)
        .max(30)
        .superRefine((rooms, ctx) => {
            const seen = new Set<string>();
            rooms.forEach((room, i) => {
                if (seen.has(room.slug)) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Two rooms share this link', path: [i, 'slug'] });
                }
                seen.add(room.slug);
            });
        }),
});

export type PropertyProfile = z.infer<typeof profileSchema>;
export type ProfileRoom = z.infer<typeof profileRoomSchema>;
export type HeroImage = z.infer<typeof heroImageSchema>;
export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type CancellationPolicy = z.infer<typeof cancellationSchema>;

/** Price, capacity and sale state of a bookable room — kept in the Room table. */
export const roomRateSchema = z.object({
    weekdayPrice: z.number().min(0).max(100000),
    weekendPrice: z.number().min(0).max(100000),
    maxGuests: count(1, 50),
    isActive: z.boolean(),
});
export type RoomRate = z.infer<typeof roomRateSchema>;

/** Body of PUT /api/admin/property. */
export const savePropertySchema = z.object({
    profile: profileSchema,
    roomRates: z.record(z.string(), roomRateSchema).default({}),
    /** Set by the wizard's last step. */
    completeOnboarding: z.boolean().optional(),
});

/** A room as pages render it. */
export type PropertyRoom = Omit<ProfileRoom, 'ogImage'> & {
    /** The long description, or the summary when none is written. */
    description: string;
    hasLongDescription: boolean;
    ogImage: string;
    /** Code seed prices, for a room listed in the config file but not yet in the Room table. */
    seedRate?: Omit<RoomRate, 'isActive'>;
};

/** Everything the site needs to know about the property. */
export type Property = Omit<PropertyProfile, 'rooms'> & {
    id: string;
    siteUrl: string;
    fromEmail: string;
    phoneE164: string;
    pricingDefaults: PropertyConfig['pricingDefaults'];
    rooms: PropertyRoom[];
    /** True once the owner has saved the profile; until then it mirrors the code config. */
    managed: boolean;
    onboardingCompletedAt: string | null;
};

export const DEFAULT_OG_IMAGE = '/og-image.jpg';

/** Room copy keys used before rooms moved into the profile. */
export function legacyRoomContentKeys(rooms: ConfigRoom[]): string[] {
    return rooms.flatMap(r => [r.titleKey, r.bedsKey, r.imageKey, r.descKey]);
}

/**
 * The profile implied by the code config, with any room copy the owner had
 * already edited (ContentBlock) taking precedence over the config's defaults.
 */
export function profileFromConfig(config: PropertyConfig, content: Record<string, string> = {}): PropertyProfile {
    const pick = (key: string, fallback: string) => content[key]?.trim() || fallback;

    return {
        name: config.name,
        brandLine: config.brandLine,
        title: config.title,
        description: config.description,
        roomsDescription: config.roomsDescription,
        ogImageAlt: config.ogImageAlt,
        propertyType: config.propertyType,
        hostName: config.hostName,
        email: config.email,
        phone: config.phone,
        address: { ...config.address },
        locationLabel: config.locationLabel,
        checkinTime: config.checkinTime,
        checkoutTime: config.checkoutTime,
        bedrooms: config.bedrooms,
        maxGuests: config.maxGuests,
        amenities: [...config.amenities],
        cancellation: { ...config.cancellation },
        permits: { strPermit: '', totCertificate: '', businessLicense: '' },
        heroImages: config.heroImages.map(img => ({ ...img })),
        galleryImages: config.galleryImages.map(img => ({ ...img })),
        rooms: config.rooms.map(room => ({
            slug: room.slug,
            bookable: room.bookable,
            title: pick(room.titleKey, room.defaultTitle),
            beds: pick(room.bedsKey, room.defaultBeds),
            image: pick(room.imageKey, room.defaultImage),
            summary: room.defaultSummary,
            description: content[room.descKey]?.trim() ?? '',
            ogImage: room.ogImage,
        })),
    };
}

/**
 * Lay a stored profile over the config's. Fields added to the schema after an
 * owner last saved fall back to the config instead of failing validation.
 */
export function mergeStoredProfile(base: PropertyProfile, stored: unknown): PropertyProfile | null {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
    const parsed = profileSchema.safeParse({ ...base, ...(stored as Record<string, unknown>) });
    return parsed.success ? parsed.data : null;
}

export function buildProperty(
    config: PropertyConfig,
    profile: PropertyProfile,
    meta: { managed: boolean; onboardingCompletedAt: Date | string | null } = { managed: false, onboardingCompletedAt: null },
): Property {
    const seedRooms = new Map(
        config.rooms.filter((r): r is BookableRoom => r.bookable).map(r => [r.slug, r])
    );

    return {
        ...profile,
        id: config.id,
        siteUrl: config.siteUrl,
        fromEmail: config.fromEmail,
        pricingDefaults: config.pricingDefaults,
        phoneE164: toE164(profile.phone) ?? config.phoneE164,
        rooms: profile.rooms.map(room => {
            const seed = room.bookable ? seedRooms.get(room.slug) : undefined;
            return {
                ...room,
                description: room.description || room.summary,
                hasLongDescription: Boolean(room.description),
                ogImage: room.ogImage || DEFAULT_OG_IMAGE,
                ...(seed
                    ? {
                          seedRate: {
                              weekdayPrice: seed.defaultWeekdayPrice,
                              weekendPrice: seed.defaultWeekendPrice,
                              maxGuests: seed.defaultMaxGuests,
                          },
                      }
                    : {}),
            };
        }),
        managed: meta.managed,
        onboardingCompletedAt:
            meta.onboardingCompletedAt instanceof Date
                ? meta.onboardingCompletedAt.toISOString()
                : meta.onboardingCompletedAt,
    };
}

/** "33800 Alta Bonny Nook Rd, Alta, CA 95701" */
export function formatAddress(a: PropertyProfile['address']): string {
    return `${a.street}, ${a.locality}, ${a.region} ${a.postalCode}`;
}

/** Absolute URL for an image that may be a site path or already a full link. */
export function absoluteImageUrl(src: string, siteUrl: string): string {
    return /^https?:\/\//.test(src) ? src : `${siteUrl}${src}`;
}

/** The rooms a guest can book on their own. */
export function bookableRooms(property: Pick<Property, 'rooms'>): PropertyRoom[] {
    return property.rooms.filter(r => r.bookable);
}
