import { describe, expect, it } from 'vitest';
import { whistleInn } from '@/config/properties/whistle-inn';
import {
    buildEnv, describeEnv, ownerInputSchema, profileSeed, projectName, siteUrl, unpooledUrl,
    type GeneratedValues, type OwnerInput, type PlatformConfig,
} from './provisioning';
import { profileSchema } from './property-schema';

const input: OwnerInput = ownerInputSchema.parse({
    id: 'pine-lodge',
    name: 'Pine Lodge',
    ownerName: 'Sam Rivera',
    ownerEmail: 'Sam@Example.com',
    phone: '(530) 555-0142',
});

const platform: PlatformConfig = {
    projectPrefix: 'stay-',
    gitRepo: 'journey247/whistle-inn',
    neonRegion: 'aws-us-east-1',
    resendApiKey: 're_test',
    defaultFromEmail: 'bookings@platform.test',
    stripeSecretKey: 'sk_test_x',
    stripePublishableKey: 'pk_test_x',
};

const generated: GeneratedValues = {
    databaseUrl: 'postgresql://u:p@ep-cool-sky-123-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
    databaseUrlUnpooled: 'postgresql://u:p@ep-cool-sky-123.us-east-1.aws.neon.tech/neondb?sslmode=require',
    stripeWebhookSecret: 'whsec_own',
    stripeConnectWebhookSecret: 'whsec_connect',
    nextAuthSecret: 'nas',
    totpEncryptionKey: 'tek',
    cronSecret: 'cs',
};

describe('ownerInputSchema', () => {
    it('lower-cases the owner email', () => {
        expect(input.ownerEmail).toBe('sam@example.com');
    });

    it('refuses ids that would make bad project names', () => {
        for (const id of ['Pine Lodge', 'pine_lodge', '-pine', 'pl']) {
            expect(ownerInputSchema.safeParse({ ...input, id }).success).toBe(false);
        }
    });

    it('accepts a bare domain but not a URL', () => {
        expect(ownerInputSchema.safeParse({ ...input, domain: 'pinelodge.com' }).success).toBe(true);
        expect(ownerInputSchema.safeParse({ ...input, domain: 'https://pinelodge.com' }).success).toBe(false);
    });

    it('needs a phone number with an area code', () => {
        expect(ownerInputSchema.safeParse({ ...input, phone: '555-0142' }).success).toBe(false);
    });
});

describe('names and URLs', () => {
    it('prefixes the project and falls back to its vercel.app URL', () => {
        const project = projectName(input, platform);
        expect(project).toBe('stay-pine-lodge');
        expect(siteUrl(input, project)).toBe('https://stay-pine-lodge.vercel.app');
        expect(siteUrl({ domain: 'pinelodge.com' }, project)).toBe('https://pinelodge.com');
    });

    it('turns a pooled Neon URL into the direct one migrations need', () => {
        expect(unpooledUrl(generated.databaseUrl)).toBe(generated.databaseUrlUnpooled);
        expect(unpooledUrl(generated.databaseUrlUnpooled)).toBe(generated.databaseUrlUnpooled);
    });
});

describe('profileSeed', () => {
    const seed = profileSeed(input);

    it('is a valid profile with the owner\'s details', () => {
        expect(profileSchema.safeParse(seed).success).toBe(true);
        expect(seed).toMatchObject({ name: 'Pine Lodge', hostName: 'Sam Rivera', email: 'sam@example.com', phone: '(530) 555-0142' });
    });

    it('carries nothing from another owner\'s property', () => {
        const text = JSON.stringify(seed);
        for (const word of [whistleInn.name, whistleInn.hostName, whistleInn.address.street, whistleInn.phone]) {
            expect(text).not.toContain(word);
        }
        expect(seed.rooms).toEqual([]);
        expect(seed.permits).toEqual({ strPermit: '', totCertificate: '', businessLicense: '' });
    });
});

describe('buildEnv', () => {
    const env = buildEnv(input, platform, 'https://pinelodge.com', generated);
    const byKey = Object.fromEntries(env.map(e => [e.key, e]));

    it('points the site at its own database, URL and the neutral template', () => {
        expect(byKey.DATABASE_URL.value).toBe(generated.databaseUrl);
        expect(byKey.DATABASE_URL_UNPOOLED.value).toBe(generated.databaseUrlUnpooled);
        expect(byKey.NEXT_PUBLIC_PROPERTY_ID.value).toBe('template');
        expect(byKey.NEXT_PUBLIC_BASE_URL.value).toBe('https://pinelodge.com');
        expect(byKey.ADMIN_REQUIRE_2FA.value).toBe('true');
        expect(byKey.RESEND_REPLY_TO.value).toBe('sam@example.com');
    });

    it('stores every secret encrypted', () => {
        for (const key of ['DATABASE_URL', 'NEXTAUTH_SECRET', 'TOTP_ENCRYPTION_KEY', 'CRON_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY']) {
            expect(byKey[key].type).toBe('encrypted');
        }
    });

    it('prefers the owner\'s own sender over the platform default', () => {
        const own = buildEnv({ ...input, fromEmail: 'stay@pinelodge.com' }, platform, 'https://x.test', generated);
        expect(own.find(e => e.key === 'RESEND_FROM_EMAIL')?.value).toBe('stay@pinelodge.com');
        expect(byKey.RESEND_FROM_EMAIL.value).toBe('bookings@platform.test');
    });

    it('leaves out what the operator has not configured', () => {
        const bare = buildEnv(input, { ...platform, stripeSecretKey: undefined, stripePublishableKey: undefined, resendApiKey: undefined },
            'https://x.test', { ...generated, stripeWebhookSecret: undefined, stripeConnectWebhookSecret: undefined });
        const keys = bare.map(e => e.key);
        expect(keys).not.toContain('STRIPE_SECRET_KEY');
        expect(keys).not.toContain('STRIPE_WEBHOOK_SECRET');
        expect(keys).not.toContain('RESEND_API_KEY');
        expect(bare.every(e => e.value !== '')).toBe(true);
    });

    it('never prints secrets in a dry run', () => {
        const printed = describeEnv(env).join('\n');
        expect(printed).not.toContain(generated.nextAuthSecret);
        expect(printed).not.toContain('sk_test_x');
        expect(printed).toContain('NEXT_PUBLIC_BASE_URL=https://pinelodge.com');
    });
});
