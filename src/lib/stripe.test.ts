import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const retrieve = vi.fn();
const findMany = vi.fn();

vi.mock('./prisma', () => ({ prisma: { contentBlock: { findMany: (...a: unknown[]) => findMany(...a) } } }));
vi.mock('stripe', () => ({
    default: class {
        accounts = { retrieve: (...a: unknown[]) => retrieve(...a) };
    },
}));

const ENV = ['STRIPE_SECRET_KEY', 'STRIPE_KEY_IS_OWNER_ACCOUNT', 'STRIPE_CONNECTED_ACCOUNT_ID'] as const;
const saved: Record<string, string | undefined> = {};

async function load() {
    vi.resetModules();
    return import('./stripe');
}

beforeEach(() => {
    for (const k of ENV) saved[k] = process.env[k];
    process.env.STRIPE_SECRET_KEY = 'sk_test_example';
    delete process.env.STRIPE_CONNECTED_ACCOUNT_ID;
    retrieve.mockReset();
    findMany.mockReset();
});

afterEach(() => {
    for (const k of ENV) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
    }
});

describe('own-account mode', () => {
    beforeEach(() => { process.env.STRIPE_KEY_IS_OWNER_ACCOUNT = 'true'; });

    it('charges on the key\'s own account when Stripe allows it', async () => {
        retrieve.mockResolvedValue({ id: 'acct_owner', charges_enabled: true });
        const s = await load();
        expect(await s.getConnectState()).toEqual({ accountId: null, chargesEnabled: true, ownAccount: true });
        expect(await s.getChargeAccountId()).toBeNull();
        expect(findMany).not.toHaveBeenCalled();
    });

    it('keeps the gate shut while Stripe has card payments paused', async () => {
        retrieve.mockResolvedValue({ id: 'acct_owner', charges_enabled: false });
        const s = await load();
        expect((await s.getConnectState()).chargesEnabled).toBe(false);
    });

    it('fails closed when Stripe cannot be reached', async () => {
        retrieve.mockRejectedValue(new Error('network'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const s = await load();
        expect((await s.getConnectState()).chargesEnabled).toBe(false);
    });

    it('caches the account between calls, and refreshes on request', async () => {
        retrieve.mockResolvedValue({ id: 'acct_owner', charges_enabled: true });
        const s = await load();
        await s.getConnectState();
        await s.getConnectState();
        expect(retrieve).toHaveBeenCalledTimes(1);
        await s.getOwnAccount(true);
        expect(retrieve).toHaveBeenCalledTimes(2);
    });

    it('ignores a pinned connected account', async () => {
        process.env.STRIPE_CONNECTED_ACCOUNT_ID = 'acct_other';
        retrieve.mockResolvedValue({ id: 'acct_owner', charges_enabled: true });
        const s = await load();
        expect(await s.getChargeAccountId()).toBeNull();
    });
});

describe('platform mode (flag unset)', () => {
    beforeEach(() => { delete process.env.STRIPE_KEY_IS_OWNER_ACCOUNT; });

    it('uses the connected account from settings, not the key\'s own account', async () => {
        findMany.mockResolvedValue([
            { key: 'stripe_connect_account_id', value: 'acct_conn' },
            { key: 'stripe_connect_charges_enabled', value: 'true' },
        ]);
        const s = await load();
        expect(s.isOwnAccountMode()).toBe(false);
        expect(await s.getChargeAccountId()).toBe('acct_conn');
        expect(retrieve).not.toHaveBeenCalled();
    });

    it('stays shut with nothing connected', async () => {
        findMany.mockResolvedValue([]);
        const s = await load();
        expect((await s.getConnectState()).chargesEnabled).toBe(false);
    });
});
