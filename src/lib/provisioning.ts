import { randomBytes } from 'crypto';
import { z } from 'zod';
import { template } from '@/config/properties/template';
import { profileFromConfig, profileSchema, toE164, type PropertyProfile } from '@/lib/property-schema';

/**
 * The decisions behind provisioning a new owner's site, kept free of network
 * calls so they can be unit-tested. scripts/provision-owner.ts performs them.
 *
 * Each owner gets their own Neon project and Vercel project built from this
 * repository, so one owner's data can never reach another's site
 * (docs/MULTI_OWNER_PLAN.md, Phase 1).
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOST_RE = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export const ownerInputSchema = z.object({
    /** Short, permanent id: names the Vercel and Neon projects. */
    id: z.string().min(3).max(40).regex(SLUG_RE, 'Lowercase letters, numbers and dashes'),
    name: z.string().trim().min(2).max(80),
    ownerName: z.string().trim().min(1).max(80),
    ownerEmail: z.string().trim().toLowerCase().email(),
    phone: z.string().trim().refine(v => toE164(v) !== null, 'Phone number with area code'),
    /** The owner's own domain; without one the site lives on <project>.vercel.app. */
    domain: z.string().trim().toLowerCase().regex(HOST_RE, 'A domain like pinelodge.com').optional(),
    /** Sender for guest email. Its domain must be verified in Resend. */
    fromEmail: z.string().trim().toLowerCase().email().optional(),
});
export type OwnerInput = z.infer<typeof ownerInputSchema>;

/** Settings shared by every owner, from the operator's environment. */
export type PlatformConfig = {
    projectPrefix: string;
    /** GitHub "owner/name" every site deploys from. */
    gitRepo: string;
    neonRegion: string;
    resendApiKey?: string;
    defaultFromEmail?: string;
    stripeSecretKey?: string;
    stripePublishableKey?: string;
};

export function projectName(input: Pick<OwnerInput, 'id'>, platform: Pick<PlatformConfig, 'projectPrefix'>): string {
    return `${platform.projectPrefix}${input.id}`;
}

export function siteUrl(input: Pick<OwnerInput, 'domain'>, project: string): string {
    return input.domain ? `https://${input.domain}` : `https://${project}.vercel.app`;
}

export function newSecret(): string {
    return randomBytes(32).toString('base64url');
}

/**
 * The profile the new site starts with: the neutral template plus the owner's
 * name and contact details, so the site never shows another owner's property.
 */
export function profileSeed(input: OwnerInput): PropertyProfile {
    return profileSchema.parse({
        ...profileFromConfig(template),
        name: input.name,
        brandLine: input.name,
        title: `${input.name} — Book Direct`,
        description: `Book your stay at ${input.name} directly with the owner.`,
        roomsDescription: `The rooms and spaces at ${input.name}.`,
        ogImageAlt: input.name,
        hostName: input.ownerName,
        email: input.ownerEmail,
        phone: input.phone,
    });
}

/** Events the webhook route handles (src/app/api/stripe/webhook/route.ts). */
export const STRIPE_WEBHOOK_EVENTS = ['checkout.session.completed', 'payment_intent.payment_failed'] as const;
export const STRIPE_CONNECT_WEBHOOK_EVENTS = [...STRIPE_WEBHOOK_EVENTS, 'account.updated'] as const;

export type EnvVar = {
    key: string;
    value: string;
    type: 'encrypted' | 'plain';
    target: ('production' | 'preview' | 'development')[];
};

export type GeneratedValues = {
    databaseUrl: string;
    databaseUrlUnpooled: string;
    stripeWebhookSecret?: string;
    stripeConnectWebhookSecret?: string;
    /** Generated once per owner; pass the same ones on a re-run. */
    nextAuthSecret: string;
    totpEncryptionKey: string;
    cronSecret: string;
};

/**
 * The new site's environment. Secrets are "encrypted"; values a reader would
 * want to see at a glance are "plain". Unset optional values are left out
 * rather than written empty, so the site's own fallbacks apply.
 */
export function buildEnv(input: OwnerInput, platform: PlatformConfig, url: string, v: GeneratedValues): EnvVar[] {
    const both: EnvVar['target'] = ['production', 'preview'];
    const secret = (key: string, value: string | undefined): EnvVar[] =>
        value ? [{ key, value, type: 'encrypted', target: both }] : [];
    const plain = (key: string, value: string | undefined): EnvVar[] =>
        value ? [{ key, value, type: 'plain', target: both }] : [];

    return [
        ...secret('DATABASE_URL', v.databaseUrl),
        ...secret('DATABASE_URL_UNPOOLED', v.databaseUrlUnpooled),
        ...secret('NEXTAUTH_SECRET', v.nextAuthSecret),
        ...secret('TOTP_ENCRYPTION_KEY', v.totpEncryptionKey),
        ...secret('CRON_SECRET', v.cronSecret),
        ...plain('NEXT_PUBLIC_PROPERTY_ID', template.id),
        ...plain('NEXT_PUBLIC_BASE_URL', url),
        ...plain('NEXT_PUBLIC_SITE_URL', url),
        ...plain('ADMIN_REQUIRE_2FA', 'true'),
        ...plain('ADMIN_EMAIL', input.ownerEmail),
        ...plain('ADMIN_NAME', input.ownerName),
        ...plain('ADMIN_PHONE', input.phone),
        ...secret('RESEND_API_KEY', platform.resendApiKey),
        ...plain('RESEND_FROM_EMAIL', input.fromEmail ?? platform.defaultFromEmail),
        ...plain('RESEND_REPLY_TO', input.ownerEmail),
        ...secret('STRIPE_SECRET_KEY', platform.stripeSecretKey),
        ...plain('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', platform.stripePublishableKey),
        ...secret('STRIPE_WEBHOOK_SECRET', v.stripeWebhookSecret),
        ...secret('STRIPE_CONNECT_WEBHOOK_SECRET', v.stripeConnectWebhookSecret),
    ];
}

/** Env var values to show in a dry run or a log: secrets masked. */
export function describeEnv(env: EnvVar[]): string[] {
    return env.map(e => `${e.key}=${e.type === 'encrypted' ? '••••' : e.value}`);
}

/**
 * The direct (unpooled) form of a Neon connection string. Migrations need a
 * direct connection; the site itself uses the pooled one.
 */
export function unpooledUrl(url: string): string {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.replace(/^(ep-[a-z0-9-]+?)-pooler\./, '$1.');
    return parsed.toString();
}
