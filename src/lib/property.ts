import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PROPERTY_DEFAULTS } from '@/config/property';
import {
    buildProperty,
    legacyRoomContentKeys,
    mergeStoredProfile,
    profileFromConfig,
    type Property,
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

export class PropertySaveError extends Error {}
