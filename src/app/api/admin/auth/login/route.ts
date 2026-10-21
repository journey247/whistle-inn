import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sanitizeInput, validateEmail, getClientIp, getJwtSecret, signSession, setSessionCookie, sessionHours } from '@/lib/adminAuth';
import { rateLimit } from '@/lib/rateLimit';
import { verifySecondFactor } from '@/lib/adminMfa';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/auth/login  { email, password, code? }
 *
 * With 2FA on, the first call (no code) answers 401 { mfaRequired: true } once
 * the password checks out, and the page asks for the authenticator code (or a
 * recovery code) and sends all three again. Stateless: no half-logged-in
 * session exists between the two calls.
 */
export async function POST(request: Request) {
    const clientIP = getClientIp(request);

    // Per IP. A 2FA login is two calls, so this allows five full attempts.
    if (!(await rateLimit(`login:${clientIP}`, 10, 300000))) {
        return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { email, password, code } = body ?? {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    try {
        getJwtSecret();
    } catch {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const sanitizedEmail = sanitizeInput(email, 254).toLowerCase();

        if (!validateEmail(sanitizedEmail)) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Per account, so rotating IPs does not buy unlimited guesses.
        if (!(await rateLimit(`login-email:${sanitizedEmail}`, 10, 900000))) {
            return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
        }

        const user = await prisma.adminUser.findUnique({ where: { email: sanitizedEmail } });
        if (!user) {
            // Simulate password check to prevent timing attacks
            await bcrypt.hash('dummy', 12);
            await audit({ action: 'auth.login_failed', details: { email: sanitizedEmail, reason: 'unknown_account' }, request });
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const match = await bcrypt.compare(password, user.hashedPassword);
        if (!match) {
            console.warn(`Failed login attempt for ${sanitizedEmail} from ${clientIP}`);
            await audit({ actor: { sub: user.id, email: user.email }, action: 'auth.login_failed', details: { reason: 'password' }, request });
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        let mfaMethod: string | undefined;
        if (user.totpSecret) {
            if (!code) {
                return NextResponse.json({ mfaRequired: true, error: 'Enter the code from your authenticator app' }, { status: 401 });
            }
            const result = await verifySecondFactor(user.id, String(code));
            if (!result.ok) {
                await audit({ actor: { sub: user.id, email: user.email }, action: 'auth.login_failed', details: { reason: '2fa' }, request });
                return NextResponse.json({ mfaRequired: true, error: 'That code did not work' }, { status: 401 });
            }
            mfaMethod = result.method;
            if (result.method === 'recovery') {
                await audit({ actor: { sub: user.id, email: user.email }, action: 'auth.recovery_code_used', details: { left: result.recoveryCodesLeft }, request });
            }
        }

        const token = signSession(user);
        console.log(`Successful login for ${sanitizedEmail} from ${clientIP}`);
        await audit({ actor: { sub: user.id, email: user.email }, action: 'auth.login', details: mfaMethod ? { mfa: mfaMethod } : undefined, request });

        const response = NextResponse.json({ expiresIn: `${sessionHours()}h` });
        setSessionCookie(response, token);
        return response;
    } catch (err) {
        console.error('Authentication error:', err);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
