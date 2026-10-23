import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { requireAdmin, AdminAuthError, signSession, setSessionCookie, twoFactorRequired } from '@/lib/adminAuth';
import { verifySecondFactor } from '@/lib/adminMfa';
import { audit } from '@/lib/audit';
import { rateLimit } from '@/lib/rateLimit';
import {
    decryptSecret, encryptSecret, generateRecoveryCodes, generateTotpSecret,
    hashRecoveryCode, otpauthUri, verifyTotp,
} from '@/lib/totp';
import { getProperty } from '@/lib/property';

export const dynamic = 'force-dynamic';

function unauthorized(err: unknown) {
    if (err instanceof AdminAuthError) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[2fa]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
}

/** GET /api/admin/auth/2fa — this admin's 2FA status. */
export async function GET(request: Request) {
    try {
        const admin = await requireAdmin(request, { allowWithout2fa: true });
        const user = await prisma.adminUser.findUnique({
            where: { id: admin.sub },
            select: { totpSecret: true, recoveryCodes: true },
        });
        return NextResponse.json({
            enabled: Boolean(user?.totpSecret),
            required: twoFactorRequired(),
            recoveryCodesLeft: user?.recoveryCodes.length ?? 0,
        });
    } catch (err) {
        return unauthorized(err);
    }
}

/**
 * POST /api/admin/auth/2fa  { action, ... }
 *
 * - setup:   new secret, kept pending until confirmed; returns QR + key.
 * - enable:  { code } confirms the pending secret, turns 2FA on, ends other
 *            sessions and returns one-time recovery codes (shown once).
 * - disable: { password, code } turns it off (refused when 2FA is required).
 * - regenerate_codes: { code } replaces the recovery codes.
 */
export async function POST(request: Request) {
    let admin;
    try {
        admin = await requireAdmin(request, { allowWithout2fa: true });
    } catch (err) {
        return unauthorized(err);
    }

    if (!(await rateLimit(`2fa:${admin.sub}`, 10, 300000))) {
        return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) ?? {};
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const actor = { sub: admin.sub, email: admin.email };
    const user = await prisma.adminUser.findUnique({ where: { id: admin.sub } });
    if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 401 });

    try {
        switch (body.action) {
            case 'setup': {
                if (user.totpSecret) {
                    return NextResponse.json({ error: 'Two-factor login is already on' }, { status: 400 });
                }
                const secret = generateTotpSecret();
                await prisma.adminUser.update({
                    where: { id: user.id },
                    data: { totpPendingSecret: encryptSecret(secret) },
                });
                const uri = otpauthUri(secret, user.email, (await getProperty()).name);
                const qrSvg = await QRCode.toString(uri, { type: 'svg', margin: 1, width: 200 });
                return NextResponse.json({ secret, uri, qrSvg });
            }

            case 'enable': {
                if (user.totpSecret) {
                    return NextResponse.json({ error: 'Two-factor login is already on' }, { status: 400 });
                }
                if (!user.totpPendingSecret) {
                    return NextResponse.json({ error: 'Start setup first' }, { status: 400 });
                }
                const step = verifyTotp(decryptSecret(user.totpPendingSecret), String(body.code ?? ''), null);
                if (step === null) {
                    return NextResponse.json({ error: 'That code did not work. Check the time on your phone and try again.' }, { status: 400 });
                }
                const recoveryCodes = generateRecoveryCodes();
                const updated = await prisma.adminUser.update({
                    where: { id: user.id },
                    data: {
                        totpSecret: user.totpPendingSecret,
                        totpPendingSecret: null,
                        totpLastStep: step,
                        recoveryCodes: recoveryCodes.map(hashRecoveryCode),
                        sessionVersion: { increment: 1 },
                    },
                });
                await audit({ actor, action: 'auth.2fa_enabled', request });
                const response = NextResponse.json({ enabled: true, recoveryCodes });
                // Every other session just ended; keep this one signed in.
                setSessionCookie(response, signSession(updated));
                return response;
            }

            case 'disable': {
                if (!user.totpSecret) {
                    return NextResponse.json({ error: 'Two-factor login is already off' }, { status: 400 });
                }
                if (twoFactorRequired()) {
                    return NextResponse.json({ error: 'Two-factor login is required on this site' }, { status: 403 });
                }
                const passwordOk = typeof body.password === 'string' && await bcrypt.compare(body.password, user.hashedPassword);
                const factor = passwordOk ? await verifySecondFactor(user.id, String(body.code ?? '')) : { ok: false };
                if (!passwordOk || !factor.ok) {
                    await audit({ actor, action: 'auth.2fa_disable_failed', request });
                    return NextResponse.json({ error: 'Password or code is wrong' }, { status: 400 });
                }
                const updated = await prisma.adminUser.update({
                    where: { id: user.id },
                    data: {
                        totpSecret: null,
                        totpPendingSecret: null,
                        totpLastStep: null,
                        recoveryCodes: { set: [] },
                        sessionVersion: { increment: 1 },
                    },
                });
                await audit({ actor, action: 'auth.2fa_disabled', request });
                const response = NextResponse.json({ enabled: false });
                setSessionCookie(response, signSession(updated));
                return response;
            }

            case 'regenerate_codes': {
                if (!user.totpSecret) {
                    return NextResponse.json({ error: 'Turn on two-factor login first' }, { status: 400 });
                }
                const factor = await verifySecondFactor(user.id, String(body.code ?? ''));
                if (!factor.ok || factor.method !== 'totp') {
                    return NextResponse.json({ error: 'Enter a current code from your authenticator app' }, { status: 400 });
                }
                const recoveryCodes = generateRecoveryCodes();
                await prisma.adminUser.update({
                    where: { id: user.id },
                    data: { recoveryCodes: recoveryCodes.map(hashRecoveryCode) },
                });
                await audit({ actor, action: 'auth.recovery_codes_regenerated', request });
                return NextResponse.json({ recoveryCodes });
            }

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (err) {
        console.error('[2fa] Action failed:', err);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
