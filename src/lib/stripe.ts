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
    /** STRIPE_SECRET_KEY is the owner's own account; there is nothing to connect. */
    ownAccount?: boolean;
};

/**
 * Own-account mode: the site's STRIPE_SECRET_KEY belongs to the owner's own
 * Stripe account (no platform in between). Payments are created on that
 * account directly, no platform fee is taken, and Connect onboarding is off,
 * so it can never redirect payments to a newly created account.
 */
export function isOwnAccountMode(): boolean {
    return process.env.STRIPE_KEY_IS_OWNER_ACCOUNT?.trim().toLowerCase() === 'true';
}

const OWN_ACCOUNT_TTL_MS = 5 * 60 * 1000;
let ownAccountCache: { at: number; account: Stripe.Account } | null = null;

/**
 * The key's own account, cached briefly so every page view doesn't call
 * Stripe. Null when Stripe is unreachable or the key is missing.
 */
export async function getOwnAccount(fresh = false): Promise<Stripe.Account | null> {
    const stripe = getStripe();
    if (!stripe) return null;
    if (!fresh && ownAccountCache && Date.now() - ownAccountCache.at < OWN_ACCOUNT_TTL_MS) {
        return ownAccountCache.account;
    }
    try {
        const account = await stripe.accounts.retrieve();
        ownAccountCache = { at: Date.now(), account };
        return account;
    } catch (error) {
        console.error('Could not load the Stripe account for this key:', error);
        return null;
    }
}

/** For tests. */
export function resetOwnAccountCache() {
    ownAccountCache = null;
}

export async function getConnectState(): Promise<ConnectState> {
    if (isOwnAccountMode()) {
        // accountId stays null: payments go on the key's own account, with no
        // Stripe-Account header. Fails closed if Stripe can't be reached.
        const account = await getOwnAccount();
        return { accountId: null, chargesEnabled: !!account?.charges_enabled, ownAccount: true };
    }

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

/**
 * Percent of a paid-ad booking (before tax) the provider keeps as a Stripe
 * application fee. Set per owner site; 0 or unset means no fee. Only applies
 * to payments on a connected account — there is no fee to take otherwise.
 */
export function adFeePercent(): number {
    const n = parseFloat(process.env.PLATFORM_AD_FEE_PERCENT ?? '');
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Stripe payment_intent_data for a direct charge carrying the ad fee, if any. */
export function feeParams(chargeAccountId: string | null, fee: number) {
    return chargeAccountId && fee > 0
        ? { payment_intent_data: { application_fee_amount: Math.round(fee * 100) } }
        : {};
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
