import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PROPERTY_DEFAULTS } from '@/config/property';
import {
    buildProperty,
    profileRoomSchema,
    legacyRoomContentKeys,
    mergeStoredProfile,
    profileFromConfig,
    type Property,
    type ProfileRoom,
    type PropertyProfile,
    type PropertyRoom,
    type RoomRate,
} from '@/lib/property-schema';

/**
 * The live property, for server code. Client components use useProperty().
 *
 * One primary-key read per request (React cache). If the database is down the
 * site still renders from the code config rather than failing every page.
 */

const PROFILE_ID = 'default';

async function legacyProfile(): Promise<PropertyProfile> {
    const blocks = await prisma.contentBlock.findMany({
        where: { key: { in: legacyRoomContentKeys(PROPERTY_DEFAULTS.rooms) } },
        select: { key: true, value: true },
    });
    return profileFromConfig(PROPERTY_DEFAULTS, Object.fromEntries(blocks.map(b => [b.key, b.value])));
}

async function loadProperty(): Promise<Property> {
    try {
        const row = await prisma.propertyProfile.findUnique({ where: { id: PROFILE_ID } });
        if (row) {
            const profile = mergeStoredProfile(profileFromConfig(PROPERTY_DEFAULTS), row.data);
            if (profile) {
                return buildProperty(PROPERTY_DEFAULTS, profile, {
                    managed: true,
                    onboardingCompletedAt: row.onboardingCompletedAt,
                });
            }
            console.error('[property] Saved profile failed validation; showing the code config');
        }
        return buildProperty(PROPERTY_DEFAULTS, await legacyProfile());
    } catch (error) {
        console.error('[property] Failed to load profile; showing the code config:', error);
        return buildProperty(PROPERTY_DEFAULTS, profileFromConfig(PROPERTY_DEFAULTS));
    }
}

export const getProperty = cache(loadProperty);

export async function getRooms(): Promise<PropertyRoom[]> {
    return (await getProperty()).rooms;
}

export async function getRoomBySlug(slug: string): Promise<PropertyRoom | undefined> {
    return (await getRooms()).find(r => r.slug === slug);
}

export async function getBookableRoomBySlug(slug: string): Promise<PropertyRoom | undefined> {
    const room = await getRoomBySlug(slug);
    return room?.bookable ? room : undefined;
}

/**
 * Save the owner's profile and the prices of its bookable rooms.
 *
 * Rooms are matched to Room rows by slug. A room dropped from the list, or no
 * longer sold on its own, is taken off the market rather than deleted, so past
 * bookings keep their room.
 */
export async function saveProperty(
    profile: PropertyProfile,
    roomRates: Record<string, RoomRate>,
    options: { completeOnboarding?: boolean } = {},
): Promise<void> {
    const bookable = profile.rooms.filter(r => r.bookable);
    const existing = await prisma.room.findMany({ select: { slug: true } });
    const have = new Set(existing.map(r => r.slug));

    const missingRate = bookable.find(r => !have.has(r.slug) && !roomRates[r.slug]);
    if (missingRate) {
        throw new PropertySaveError(`Set a price for ${missingRate.title}`);
    }

    const keep = new Set(bookable.map(r => r.slug));

    await prisma.$transaction([
        prisma.propertyProfile.upsert({
            where: { id: PROFILE_ID },
            create: {
                id: PROFILE_ID,
                data: profile,
                onboardingCompletedAt: options.completeOnboarding ? new Date() : null,
            },
            update: {
                data: profile,
                ...(options.completeOnboarding ? { onboardingCompletedAt: new Date() } : {}),
            },
        }),
        ...bookable.map((room, sortOrder) => {
            const rate = roomRates[room.slug];
            return prisma.room.upsert({
                where: { slug: room.slug },
                update: { name: room.title, sortOrder, ...(rate ?? {}) },
                create: { slug: room.slug, name: room.title, sortOrder, ...rate! },
            });
        }),
        prisma.room.updateMany({
            where: { slug: { notIn: [...keep] } },
            data: { isActive: false },
        }),
    ]);

    // Every page reads the property, so purge the whole ISR cache.
    revalidatePath('/', 'layout');
}

/**
 * Update one room's copy and photo, leaving everything else alone.
 *
 * Exists so the owner can fix a room description from the Rooms tab without
 * walking the six-step Property wizard — and, more importantly, without the
 * save being blocked by an unrelated validation error elsewhere in the
 * profile (a missing permit, a photo caption). Only this room is validated.
 */
export async function updateRoomContent(
    slug: string,
    patch: Partial<Pick<ProfileRoom, 'title' | 'summary' | 'description' | 'image'>>,
): Promise<void> {
    const row = await prisma.propertyProfile.findUnique({ where: { id: PROFILE_ID } });
    const base = profileFromConfig(PROPERTY_DEFAULTS);
    const profile = row ? mergeStoredProfile(base, row.data) : await legacyProfile();

    if (!profile) throw new PropertySaveError('The saved property profile is invalid');

    const index = profile.rooms.findIndex(r => r.slug === slug);
    if (index === -1) throw new PropertySaveError('Unknown room');

    const merged = { ...profile.rooms[index], ...patch };
    const parsed = profileRoomSchema.safeParse(merged);
    if (!parsed.success) {
        throw new PropertySaveError(parsed.error.issues[0]?.message ?? 'Invalid room');
    }

    const rooms = profile.rooms.map((r, i) => (i === index ? parsed.data : r));

    await prisma.propertyProfile.upsert({
        where: { id: PROFILE_ID },
        create: { id: PROFILE_ID, data: { ...profile, rooms }, onboardingCompletedAt: null },
        update: { data: { ...profile, rooms } },
    });

    // The room page, the rooms index and the home page all show this copy.
    revalidatePath('/', 'layout');
}

export class PropertySaveError extends Error {}
