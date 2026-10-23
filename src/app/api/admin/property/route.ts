import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';
import { audit } from '@/lib/audit';
import { invalidatePricingCache } from '@/lib/pricing-server';
import { getProperty, saveProperty, PropertySaveError } from '@/lib/property';
import { DEFAULT_OG_IMAGE, savePropertySchema, type PropertyProfile, type RoomRate } from '@/lib/property-schema';

export const dynamic = 'force-dynamic';

/**
 * The property profile the setup wizard edits.
 *
 * GET returns the profile as the site currently shows it (the code config
 * until the first save) plus each bookable room's price row. PUT replaces the
 * whole profile; the wizard always sends every section.
 */

function toProfile(property: Awaited<ReturnType<typeof getProperty>>): PropertyProfile {
    const {
        id: _id, siteUrl: _siteUrl, fromEmail: _fromEmail, phoneE164: _phoneE164,
        pricingDefaults: _pricingDefaults, managed: _managed, onboardingCompletedAt: _done,
        rooms, ...profile
    } = property;

    return {
        ...profile,
        rooms: rooms.map(({ hasLongDescription, seedRate: _seed, description, summary, ogImage, ...room }) => ({
            ...room,
            summary,
            // The page shows the summary when there is no long description;
            // the editor should show the field as empty, not as the summary.
            description: hasLongDescription ? description : '',
            ogImage: ogImage === DEFAULT_OG_IMAGE ? undefined : ogImage,
        })),
    };
}

export async function GET(request: Request) {
    try {
        await requireAdmin(request);

        const [property, rows] = await Promise.all([getProperty(), prisma.room.findMany()]);
        const bySlug = new Map(rows.map(r => [r.slug, r]));

        const roomRates: Record<string, RoomRate> = {};
        for (const room of property.rooms) {
            const row = bySlug.get(room.slug);
            if (row) {
                roomRates[room.slug] = {
                    weekdayPrice: row.weekdayPrice,
                    weekendPrice: row.weekendPrice,
                    maxGuests: row.maxGuests,
                    isActive: row.isActive,
                };
            } else if (room.seedRate) {
                roomRates[room.slug] = { ...room.seedRate, isActive: true };
            }
        }

        return NextResponse.json({
            profile: toProfile(property),
            roomRates,
            managed: property.managed,
            onboardingCompletedAt: property.onboardingCompletedAt,
        });
    } catch (error) {
        if (error instanceof AdminAuthError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Property fetch error:', error);
        return NextResponse.json({ error: 'Failed to load the property' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const admin = await requireAdmin(request);

        const parsed = savePropertySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            return NextResponse.json(
                { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid property', issues: parsed.error.issues },
                { status: 400 }
            );
        }

        const { profile, roomRates, completeOnboarding } = parsed.data;
        await saveProperty(profile, roomRates, { completeOnboarding });

        // Quotes are served from a 5-minute cache; new prices must apply now.
        invalidatePricingCache();

        await audit({
            actor: admin,
            action: completeOnboarding ? 'property.onboarding_completed' : 'property.updated',
            details: { name: profile.name, rooms: profile.rooms.map(r => r.slug) },
            request,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AdminAuthError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof PropertySaveError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error('Property save error:', error);
        return NextResponse.json({ error: 'Failed to save the property' }, { status: 500 });
    }
}
