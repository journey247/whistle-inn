import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

const findUnique = vi.fn();
const auditMock = vi.fn();
vi.mock('./prisma', () => ({ prisma: { adminUser: { findUnique: (...a: unknown[]) => findUnique(...a) } } }));
vi.mock('./audit', () => ({ audit: (...a: unknown[]) => auditMock(...a) }));

import { requireAdmin, signSession, AdminAuthError, ADMIN_SESSION_COOKIE } from './adminAuth';

const user = { id: 'u1', email: 'host@example.com', role: 'admin', sessionVersion: 2, totpSecret: null as string | null };

function req(token: string, method = 'GET', path = '/api/admin/bookings') {
    return new Request(`http://localhost${path}`, { method, headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` } });
}

describe('requireAdmin', () => {
    beforeEach(() => {
        findUnique.mockResolvedValue({ ...user });
        auditMock.mockReset();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => { delete process.env.ADMIN_REQUIRE_2FA; });

    it('accepts a session signed at the current version', async () => {
        const admin = await requireAdmin(req(signSession(user)));
        expect(admin.sub).toBe('u1');
    });

    it('rejects a session from before the version was bumped', async () => {
        const old = signSession({ ...user, sessionVersion: 1 });
        await expect(requireAdmin(req(old))).rejects.toThrow('Session revoked');
    });

    it('treats a token without a version as version 0', async () => {
        const legacy = jwt.sign({ sub: 'u1', email: user.email, role: 'admin' }, 'dev-secret');
        await expect(requireAdmin(req(legacy))).rejects.toBeInstanceOf(AdminAuthError);
        findUnique.mockResolvedValue({ ...user, sessionVersion: 0 });
        await expect(requireAdmin(req(legacy))).resolves.toMatchObject({ sub: 'u1' });
    });

    it('rejects a deleted account', async () => {
        findUnique.mockResolvedValue(null);
        await expect(requireAdmin(req(signSession(user)))).rejects.toThrow('Account no longer exists');
    });

    it('blocks accounts without 2FA when it is required, except on setup routes', async () => {
        process.env.ADMIN_REQUIRE_2FA = 'true';
        const token = signSession(user);
        await expect(requireAdmin(req(token))).rejects.toThrow('Two-factor setup required');
        await expect(requireAdmin(req(token), { allowWithout2fa: true })).resolves.toMatchObject({ sub: 'u1' });
        findUnique.mockResolvedValue({ ...user, totpSecret: 'v1:x:y:z' });
        await expect(requireAdmin(req(token))).resolves.toMatchObject({ sub: 'u1' });
    });

    it('audits writes by method and path, and not reads', async () => {
        const token = signSession(user);
        await requireAdmin(req(token, 'GET'));
        expect(auditMock).not.toHaveBeenCalled();
        await requireAdmin(req(token, 'DELETE', '/api/admin/bookings/b1'));
        expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
            action: 'DELETE /api/admin/bookings/b1',
            actor: { sub: 'u1', email: user.email },
        }));
    });
});
