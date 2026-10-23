import { describe, expect, it } from 'vitest';
import { whistleInn } from '@/config/properties/whistle-inn';
import {
    buildProperty,
    isAllowedImageSrc,
    mergeStoredProfile,
    profileFromConfig,
    profileSchema,
    savePropertySchema,
    slugify,
    toE164,
    DEFAULT_OG_IMAGE,
    type PropertyProfile,
} from './property-schema';
import { calculateRefund, policySentence } from './cancellationPolicy';

const base = () => profileFromConfig(whistleInn);

describe('toE164', () => {
    it('adds +1 to ten-digit US numbers, however they are formatted', () => {
        expect(toE164('(530) 448-6242')).toBe('+15304486242');
        expect(toE164('530.448.6242')).toBe('+15304486242');
        expect(toE164('1 530 448 6242')).toBe('+15304486242');
    });

    it('keeps an explicit country code', () => {
        expect(toE164('+44 20 7946 0958')).toBe('+442079460958');
    });

    it('rejects numbers without an area code', () => {
        expect(toE164('448-6242')).toBeNull();
        expect(toE164('')).toBeNull();
    });
});

describe('slugify', () => {
    it('makes a stable link from a room name', () => {
        expect(slugify("The Conductor's Suite")).toBe('the-conductor-s-suite');
        expect(slugify('  Café Room  ')).toBe('cafe-room');
        expect(slugify('!!!')).toBe('');
    });
});

describe('isAllowedImageSrc', () => {
    it('accepts site paths and uploaded photos', () => {
        expect(isAllowedImageSrc('/pool.webp')).toBe(true);
        expect(isAllowedImageSrc('https://abc123.public.blob.vercel-storage.com/uploads/x.jpg')).toBe(true);
    });

    it('refuses hosts next/image is not configured for', () => {
        expect(isAllowedImageSrc('https://example.com/x.jpg')).toBe(false);
        expect(isAllowedImageSrc('http://abc.public.blob.vercel-storage.com/x.jpg')).toBe(false);
        expect(isAllowedImageSrc('//example.com/x.jpg')).toBe(false);
        expect(isAllowedImageSrc('javascript:alert(1)')).toBe(false);
    });
});

describe('profileFromConfig', () => {
    it('turns the shipped config into a valid profile', () => {
        const result = profileSchema.safeParse(base());
        expect(result.success ? [] : result.error.issues).toEqual([]);
    });

    it('carries room copy already edited in the website editor', () => {
        const profile = profileFromConfig(whistleInn, {
            room_1_title: 'The Big Room',
            room_1_desc: 'Long copy.',
            room_img_0: '/new.jpg',
            room_2_title: '   ',
        });
        expect(profile.rooms[0]).toMatchObject({ title: 'The Big Room', description: 'Long copy.', image: '/new.jpg' });
        // Blank values fall back to the config rather than blanking the room.
        expect(profile.rooms[1].title).toBe('The Tree House Room');
    });
});

describe('mergeStoredProfile', () => {
    it('fills fields missing from an older saved profile from the config', () => {
        const { permits: _permits, ...older } = { ...base(), name: 'Pine Lodge' };
        const merged = mergeStoredProfile(base(), older);
        expect(merged?.name).toBe('Pine Lodge');
        expect(merged?.permits).toEqual({ strPermit: '', totCertificate: '', businessLicense: '' });
    });

    it('returns null for anything that does not validate', () => {
        expect(mergeStoredProfile(base(), null)).toBeNull();
        expect(mergeStoredProfile(base(), [])).toBeNull();
        expect(mergeStoredProfile(base(), { email: 'not-an-email' })).toBeNull();
    });
});

describe('profileSchema', () => {
    const withRooms = (rooms: PropertyProfile['rooms']) => ({ ...base(), rooms });

    it('refuses two rooms with the same link', () => {
        const room = base().rooms[0];
        const result = profileSchema.safeParse(withRooms([room, { ...room, title: 'Copy' }]));
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].path).toEqual(['rooms', 1, 'slug']);
    });

    it('refuses a partial-refund window that starts before the full-refund one', () => {
        const profile = { ...base(), cancellation: { ...base().cancellation, fullRefundDays: 3, partialRefundDays: 5 } };
        expect(profileSchema.safeParse(profile).success).toBe(false);
    });

    it('needs at least one homepage photo', () => {
        expect(profileSchema.safeParse({ ...base(), heroImages: [] }).success).toBe(false);
    });

    it('accepts a property with no rooms of its own', () => {
        expect(profileSchema.safeParse(withRooms([])).success).toBe(true);
    });
});

describe('savePropertySchema', () => {
    it('rejects negative prices', () => {
        const result = savePropertySchema.safeParse({
            profile: base(),
            roomRates: { 'train-room': { weekdayPrice: -1, weekendPrice: 100, maxGuests: 2, isActive: true } },
        });
        expect(result.success).toBe(false);
    });
});

describe('buildProperty', () => {
    it('mirrors the config before the owner saves anything', () => {
        const property = buildProperty(whistleInn, base());
        expect(property.managed).toBe(false);
        expect(property.phoneE164).toBe(whistleInn.phoneE164);
        expect(property.rooms.map(r => r.slug)).toEqual(whistleInn.rooms.map(r => r.slug));
    });

    it('uses the summary until a long description is written', () => {
        const profile = base();
        profile.rooms[0] = { ...profile.rooms[0], description: '' };
        profile.rooms[1] = { ...profile.rooms[1], description: 'Long.' };
        const [first, second] = buildProperty(whistleInn, profile).rooms;
        expect(first).toMatchObject({ description: first.summary, hasLongDescription: false });
        expect(second).toMatchObject({ description: 'Long.', hasLongDescription: true });
    });

    it('gives seed prices only to bookable rooms from the config', () => {
        const profile = base();
        profile.rooms.push({
            slug: 'garden-room', bookable: true, title: 'Garden Room', beds: '1 Queen',
            image: '/garden.jpg', summary: 'New.', description: '',
        });
        const rooms = buildProperty(whistleInn, profile, { managed: true, onboardingCompletedAt: null }).rooms;
        expect(rooms.find(r => r.slug === 'train-room')?.seedRate).toEqual({ weekdayPrice: 185, weekendPrice: 215, maxGuests: 4 });
        expect(rooms.find(r => r.slug === 'living-space')?.seedRate).toBeUndefined();
        const garden = rooms.find(r => r.slug === 'garden-room');
        expect(garden?.seedRate).toBeUndefined();
        expect(garden?.ogImage).toBe(DEFAULT_OG_IMAGE);
    });

    it('derives the dialable phone number from what the owner typed', () => {
        const property = buildProperty(whistleInn, { ...base(), phone: '(916) 555-0100' });
        expect(property.phoneE164).toBe('+19165550100');
    });
});

describe('cancellation policy from the profile', () => {
    const policy = { graceHours: 48, graceMinDaysBeforeCheckIn: 14, fullRefundDays: 30, partialRefundDays: 7, partialRefundPercent: 25 };
    const now = new Date('2026-06-01T12:00:00Z');
    const booked = new Date('2026-05-01T12:00:00Z');
    const daysOut = (d: number) => new Date(now.getTime() + d * 86400000);

    it('applies the owner\'s tiers, not the config\'s', () => {
        expect(calculateRefund(400, daysOut(31), booked, now, policy).tier).toBe('full');
        expect(calculateRefund(400, daysOut(10), booked, now, policy)).toMatchObject({ tier: 'half', refundAmount: 100 });
        expect(calculateRefund(400, daysOut(3), booked, now, policy).tier).toBe('none');
    });

    it('describes the same tiers in emails', () => {
        expect(policySentence(policy)).toBe(
            'Full refund if cancelled 30+ days before check-in. 25% refund if cancelled 7–29 days before. No refund within 7 days of check-in.'
        );
    });
});
