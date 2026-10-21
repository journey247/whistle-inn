import { describe, it, expect, vi } from 'vitest';

const queryRaw = vi.fn();
vi.mock('./prisma', () => ({ prisma: { $queryRaw: (...args: unknown[]) => queryRaw(...args) } }));

import { rateLimit, localRateLimit } from './rateLimit';

describe('rateLimit', () => {
    it('allows while the shared count is within the limit', async () => {
        queryRaw.mockResolvedValueOnce([{ count: 5 }]);
        expect(await rateLimit('login:1.2.3.4', 5, 60_000)).toBe(true);
        queryRaw.mockResolvedValueOnce([{ count: 6 }]);
        expect(await rateLimit('login:1.2.3.4', 5, 60_000)).toBe(false);
    });

    it('never sends the raw identifier to the database', async () => {
        queryRaw.mockResolvedValueOnce([{ count: 1 }]);
        await rateLimit('login-email:host@example.com', 5, 60_000);
        const values = queryRaw.mock.calls.at(-1)!.slice(1);
        expect(values.join(' ')).not.toContain('host@example.com');
        expect(values[0]).toMatch(/^[0-9a-f]{64}$/);
    });

    it('falls back to local counting when the database is down', async () => {
        queryRaw.mockRejectedValue(new Error('db down'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const results = [];
        for (let i = 0; i < 4; i++) results.push(await rateLimit('fallback-key', 3, 60_000));
        expect(results).toEqual([true, true, true, false]);
        queryRaw.mockReset();
    });
});

describe('localRateLimit', () => {
    it('resets once the window has passed', () => {
        expect(localRateLimit('k', 1, 1000, 0)).toBe(true);
        expect(localRateLimit('k', 1, 1000, 500)).toBe(false);
        expect(localRateLimit('k', 1, 1000, 1000)).toBe(true);
    });
});
