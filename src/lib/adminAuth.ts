import jwt from 'jsonwebtoken';
import type { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { audit } from './audit';

/**
 * Thrown by requireAdmin for every authentication failure.
 *
 * Routes previously decided between 401 and 500 by string-matching the error
 * message for "token"/"auth", which silently misclassified any new message —
 * a revoked account got a 500 instead of a 401. Check `instanceof` instead.
 */
export class AdminAuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AdminAuthError';
    }
}

/** Name of the httpOnly cookie carrying the admin session JWT. */
export const ADMIN_SESSION_COOKIE = 'admin_session';

/**
 * Resolve the configured JWT secret, refusing insecure values in production.
 */
export function getJwtSecret(): string {
    const jwtSecret = process.env.NEXTAUTH_SECRET;

    if (!jwtSecret) {
        if (process.env.NODE_ENV === 'production') {
            console.error('CRITICAL: JWT secret not configured');
            throw new Error('Server configuration error');
        }
        console.warn('Using development fallback JWT secret (dev-secret)');
        return 'dev-secret';
    }

    if (process.env.NODE_ENV === 'production' && jwtSecret === 'dev-secret') {
        console.error('CRITICAL: Using insecure dev-secret in production');
        throw new Error('Server configuration error');
    }

    return jwtSecret;
}

/**
 * Read the session token from the httpOnly cookie, falling back to an
 * Authorization: Bearer header.
 *
 * The cookie is how the browser authenticates. The header fallback keeps the
 * API scriptable (curl, tests, integrations) without a browser session.
 */
function extractToken(request: Request): string | null {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
        for (const part of cookieHeader.split(';')) {
            const [name, ...rest] = part.trim().split('=');
            if (name === ADMIN_SESSION_COOKIE && rest.length) {
                return decodeURIComponent(rest.join('='));
            }
        }
    }

    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
        return auth.slice('Bearer '.length).trim() || null;
    }

    return null;
}

/**
 * Verify that the caller is a currently-valid admin.
 *
 * Throws on any failure — callers should catch and return 401.
 *
 * NOTE: this is async and MUST be awaited. It replaced a synchronous
 * `verifyAdmin`, and was renamed rather than changed in place so that every
 * call site fails to compile until it is updated — a missed `await` here would
 * mean an unhandled rejection and a request continuing as authenticated.
 *
 * Unlike the function it replaces, this confirms the account still exists.
 * Previously a signed token kept working on every admin endpoint until it
 * expired, even after the account behind it had been deleted.
 */
export async function requireAdmin(request: Request, options: { allowWithout2fa?: boolean } = {}) {
    const token = extractToken(request);

    if (!token) {
        throw new AdminAuthError('Missing or invalid authorization');
    }

    const jwtSecret = getJwtSecret();

    let decoded: jwt.JwtPayload;
    try {
        decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
    } catch (err) {
        if (err instanceof jwt.JsonWebTokenError) {
            console.warn('JWT verification failed:', err.message);
            throw new AdminAuthError('Invalid token');
        }
        throw new AdminAuthError('Authentication failed');
    }

    if (!decoded.sub || !decoded.email || !decoded.role) {
        throw new AdminAuthError('Invalid token structure');
    }

    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        throw new AdminAuthError('Token expired');
    }

    // The account must still exist. Without this a revoked admin keeps full
    // access for the remaining lifetime of their token.
    const user = await prisma.adminUser.findUnique({
        where: { id: String(decoded.sub) },
        select: { id: true, email: true, role: true, sessionVersion: true, totpSecret: true },
    });

    if (!user) {
        throw new AdminAuthError('Account no longer exists');
    }

    // Tokens issued before 2FA was turned on/off or the password was reset
    // carry an older version and are revoked. Tokens from before this field
    // existed have no `sv`, which reads as 0 — the column's default.
    if ((Number(decoded.sv) || 0) !== user.sessionVersion) {
        throw new AdminAuthError('Session revoked');
    }

    // With ADMIN_REQUIRE_2FA on, an account without 2FA can reach only the
    // routes that let it set 2FA up.
    if (twoFactorRequired() && !user.totpSecret && !options.allowWithout2fa) {
        throw new AdminAuthError('Two-factor setup required');
    }

    // Every admin write is logged with no per-route code, so a new route
    // cannot forget to. Only method and path: bodies can hold passwords.
    const method = request.method?.toUpperCase();
    if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        let path = '';
        try { path = new URL(request.url).pathname; } catch { /* non-URL request in tests */ }
        await audit({ actor: { sub: user.id, email: user.email }, action: `${method} ${path}`, request });
    }

    return { sub: user.id, email: user.email, role: user.role, raw: decoded };
}

/** ADMIN_REQUIRE_2FA=true makes authenticator-app 2FA mandatory. */
export function twoFactorRequired(): boolean {
    return process.env.ADMIN_REQUIRE_2FA === 'true';
}

/** Session length in hours, from SESSION_TIMEOUT_HOURS (1–24, default 8). */
export function sessionHours(): number {
    const parsed = parseInt(process.env.SESSION_TIMEOUT_HOURS || '', 10);
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 24 ? parsed : 8;
}

/** Sign a session token for an admin, stamped with their session version. */
export function signSession(user: { id: string; email: string; role: string | null; sessionVersion: number }): string {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role, sv: user.sessionVersion },
        getJwtSecret(),
        { expiresIn: `${sessionHours()}h` },
    );
}

/**
 * Put the session on a response as an httpOnly cookie.
 *
 * Page scripts cannot read it — a stored token was readable by any XSS on the
 * admin origin. SameSite=Strict is the CSRF defence now that a cookie is sent
 * automatically; combined with the middleware's JSON content-type
 * requirement, a cross-site form post cannot reach a mutating endpoint.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
    response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: sessionHours() * 60 * 60,
    });
}

/**
 * Best-effort client IP.
 *
 * x-forwarded-for is a client-supplied list that a caller can prepend to, so
 * the *last* entry is the one appended by the closest trusted proxy. On Vercel,
 * x-real-ip is set by the platform and is the value to prefer.
 */
export function getClientIp(request: Request): string {
    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;

    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const parts = forwarded.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length) return parts[parts.length - 1];
    }

    return 'unknown';
}

// Input sanitization and validation
export function sanitizeInput(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
        throw new Error('Invalid input type');
    }

    return input.trim().slice(0, maxLength);
}

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}
