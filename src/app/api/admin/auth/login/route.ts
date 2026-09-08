import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { checkRateLimit, sanitizeInput, validateEmail, getClientIp, ADMIN_SESSION_COOKIE } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const clientIP = getClientIp(request);

    // Rate limiting for login attempts
    if (!checkRateLimit(`login-${clientIP}`, 5, 300000)) { // 5 attempts per 5 minutes
        return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Ensure JWT secret is configured. Allow a development fallback when not in production.
    let jwtSecret = process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
        if (process.env.NODE_ENV === 'production') {
            console.error('CRITICAL: JWT secret not configured properly');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        console.warn('Using development fallback JWT secret (dev-secret) for login');
        jwtSecret = 'dev-secret';
    }

    try {
        const sanitizedEmail = sanitizeInput(email, 254).toLowerCase();

        if (!validateEmail(sanitizedEmail)) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const user = await prisma.adminUser.findUnique({ where: { email: sanitizedEmail } });
        if (!user) {
            // Simulate password check to prevent timing attacks
            await bcrypt.hash('dummy', 12);
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const match = await bcrypt.compare(password, user.hashedPassword);
        if (!match) {
            console.warn(`Failed login attempt for ${sanitizedEmail} from ${clientIP}`);
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Session length. This previously read SESSION_TIMEOUT_HOURS but then
        // hardcoded '8h' into the token, so the response advertised a lifetime
        // the token did not actually have.
        const parsedTimeout = parseInt(process.env.SESSION_TIMEOUT_HOURS || '', 10);
        const sessionTimeout = Number.isFinite(parsedTimeout) && parsedTimeout > 0 && parsedTimeout <= 24
            ? parsedTimeout
            : 8;

        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role
            },
            jwtSecret,
            { expiresIn: `${sessionTimeout}h` }
        );

        console.log(`Successful login for ${sanitizedEmail} from ${clientIP}`);

        // The session travels in an httpOnly cookie so page scripts cannot read
        // it — a stored token was readable by any XSS on the admin origin.
        // SameSite=Strict is the CSRF defence now that a cookie is sent
        // automatically; combined with the middleware's JSON content-type
        // requirement, a cross-site form post cannot reach a mutating endpoint.
        const response = NextResponse.json({ expiresIn: `${sessionTimeout}h` });
        response.cookies.set({
            name: ADMIN_SESSION_COOKIE,
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: sessionTimeout * 60 * 60,
        });
        return response;
    } catch (err) {
        console.error('Authentication error:', err);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
