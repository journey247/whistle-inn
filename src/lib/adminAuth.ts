import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

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
export async function requireAdmin(request: Request) {
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
        select: { id: true, email: true, role: true },
    });

    if (!user) {
        throw new AdminAuthError('Account no longer exists');
    }

    return { sub: user.id, email: user.email, role: user.role, raw: decoded };
}

/**
 * Best-effort in-process rate limiter.
 *
 * Per-instance on serverless, so treat it as friction rather than a guarantee;
 * a shared store (Vercel KV / Upstash) is the real fix for multi-instance
 * deployments. Entries are swept on write so the map cannot grow without bound
 * — it previously retained every key it had ever seen.
 */
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_MAX_KEYS = 10_000;

function sweepExpired(now: number, windowMs: number) {
    for (const [key, entry] of rateLimitStore) {
        if (now - entry.timestamp > windowMs) rateLimitStore.delete(key);
    }
    // Hard cap as a backstop against a flood of distinct keys within one window
    if (rateLimitStore.size > RATE_LIMIT_MAX_KEYS) {
        const excess = rateLimitStore.size - RATE_LIMIT_MAX_KEYS;
        let i = 0;
        for (const key of rateLimitStore.keys()) {
            if (i++ >= excess) break;
            rateLimitStore.delete(key);
        }
    }
}

export function checkRateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 60000) {
    const now = Date.now();
    const current = rateLimitStore.get(identifier);

    if (!current || now - current.timestamp > windowMs) {
        sweepExpired(now, windowMs);
        rateLimitStore.set(identifier, { count: 1, timestamp: now });
        return true;
    }

    if (current.count >= maxRequests) {
        return false;
    }

    current.count++;
    return true;
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
