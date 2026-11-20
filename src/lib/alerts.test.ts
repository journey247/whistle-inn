import { describe, it, expect, vi, beforeEach } from 'vitest';

const findFirst = vi.fn();
const create = vi.fn();
const sendEmail = vi.fn();
vi.mock('./prisma', () => ({ prisma: { notification: { findFirst: (...a: unknown[]) => findFirst(...a), create: (...a: unknown[]) => create(...a) } } }));
vi.mock('./email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { alertOnce, escapeHtml, reportFailure } from './alerts';

const alert = { key: 'k1', type: 'booking_conflict' as const, title: 'T', message: 'Guest <b>Bob</b>\nline two', audience: ['owner' as const, 'ops' as const] };

describe('alertOnce', () => {
    beforeEach(() => {
        findFirst.mockReset().mockResolvedValue(null);
        create.mockReset().mockResolvedValue({});
        sendEmail.mockReset().mockResolvedValue({});
        process.env.ADMIN_EMAIL = 'owner@example.test';
        process.env.OPS_ALERT_EMAIL = 'ops@example.test';
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('stores it and emails owner and ops, with the message escaped', async () => {
        expect(await alertOnce(alert)).toBe(true);
        expect(create).toHaveBeenCalledOnce();
        expect(sendEmail.mock.calls.map(c => (c[0] as { to: string }).to)).toEqual(['owner@example.test', 'ops@example.test']);
        expect((sendEmail.mock.calls[0][0] as { body: string }).body).toBe('<p>Guest &lt;b&gt;Bob&lt;/b&gt;<br>line two</p>');
    });

    it('does nothing when the same key was already alerted', async () => {
        findFirst.mockResolvedValue({ id: 'n1' });
        expect(await alertOnce(alert)).toBe(false);
        expect(create).not.toHaveBeenCalled();
        expect(sendEmail).not.toHaveBeenCalled();
    });

    it('only looks back repeatAfterHours when set', async () => {
        await alertOnce({ ...alert, repeatAfterHours: 6 });
        const where = findFirst.mock.calls[0][0].where;
        expect(where.createdAt.gte).toBeInstanceOf(Date);
        expect(Date.now() - where.createdAt.gte.getTime()).toBeGreaterThan(6 * 3600 * 1000 - 1000);
    });

    it('never throws, even if the database is down', async () => {
        findFirst.mockRejectedValue(new Error('db down'));
        await expect(alertOnce(alert)).resolves.toBe(false);
    });

    it('sends failures to ops only', async () => {
        await reportFailure('iCal sync', new Error('boom'));
        expect(sendEmail.mock.calls.map(c => (c[0] as { to: string }).to)).toEqual(['ops@example.test']);
    });
});

describe('escapeHtml', () => {
    it('escapes markup and quotes', () => {
        expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    });
});
