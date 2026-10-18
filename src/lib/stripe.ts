import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

/**
 * Stripe client and the owner's connected account.
 *
 * STRIPE_SECRET_KEY is the platform's key (yours, as the site provider). When
 * the owner has connected a Stripe account and it can take charges, guest
 * payments are created directly on that account: the owner is the merchant of
 * record, the money lands in their balance, and refunds and disputes are theirs.
 *
 * With no connected account (or one still onboarding), payments are created on
 * the key's own account — exactly how the site worked before Connect.
 */

export const STRIPE_API_VERSION = '2026-01-28.clover' as const;

const CONNECT_KEYS = {
    accountId: 'stripe_connect_account_id',
    chargesEnabled: 'stripe_connect_charges_enabled',
} as const;

function readKey(name: string): string | null {
    const raw = process.env[name];
    if (!raw) return null;
    const key = raw.trim(); // strip \r\n or trailing whitespace from Vercel env vars
    if (!key || key.toLowerCase().includes('placeholder') || key.toLowerCase().includes('waiting')) return null;
    return key;
}

let client: Stripe | null | undefined;

/** Null when the key is missing or a placeholder; callers decide whether that is fatal. */
export function getStripe(): Stripe | null {
    if (client === undefined) {
        const key = readKey('STRIPE_SECRET_KEY');
        client = key ? new Stripe(key, { apiVersion: STRIPE_API_VERSION }) : null;
    }
    return client;
}

export type ConnectState = {
    accountId: string | null;
    chargesEnabled: boolean;
};

export async function getConnectState(): Promise<ConnectState> {
    // An env override lets an operator pin an account that is already live,
    // without the admin onboarding flow; it is trusted to take charges.
    const envAccount = readKey('STRIPE_CONNECTED_ACCOUNT_ID');
    if (envAccount) return { accountId: envAccount, chargesEnabled: true };
    const blocks = await prisma.contentBlock.findMany({
        where: { key: { in: Object.values(CONNECT_KEYS) } },
        select: { key: true, value: true },
    });
    const byKey = Object.fromEntries(blocks.map(b => [b.key, b.value.trim()]));
    const accountId = byKey[CONNECT_KEYS.accountId] || null;
    return {
        accountId,
        chargesEnabled: !!accountId && byKey[CONNECT_KEYS.chargesEnabled] === 'true',
    };
}

/**
 * The account new guest payments should be created on, or null for the
 * platform's own account. Only an account that can take charges is used, so a
 * half-finished onboarding never breaks checkout.
 */
export async function getChargeAccountId(): Promise<string | null> {
    const state = await getConnectState();
    return state.chargesEnabled ? state.accountId : null;
}

/** Request options for a call on a booking's account (null/undefined = platform). */
export function onAccount(accountId: string | null | undefined): Stripe.RequestOptions | undefined {
    return accountId ? { stripeAccount: accountId } : undefined;
}

async function upsertSetting(key: string, value: string, label: string) {
    await prisma.contentBlock.upsert({
        where: { key },
        update: { value },
        create: { key, value, label, type: 'text', section: 'payments', category: 'stripe' },
    });
}

export async function saveConnectAccountId(accountId: string) {
    await upsertSetting(CONNECT_KEYS.accountId, accountId, 'Stripe connected account');
}

/** Record whether the account can take charges; called after onboarding and from webhooks. */
export async function saveChargesEnabled(accountId: string, enabled: boolean) {
    const state = await getConnectState();
    if (state.accountId !== accountId) return; // an event for some other account
    await upsertSetting(CONNECT_KEYS.chargesEnabled, String(enabled), 'Stripe account can take charges');
}
