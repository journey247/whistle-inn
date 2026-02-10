import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { checkRateLimit, sanitizeInput, validateEmail } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

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

    // Ensure JWT secret is configured
    const jwtSecret = process.env.NEXTAUTH_SECRET;
    if (!jwtSecret || jwtSecret === 'dev-secret') {
        console.error('CRITICAL: JWT secret not configured properly');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
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

        // Create JWT with shorter expiry time
        const sessionTimeout = process.env.SESSION_TIMEOUT_HOURS || '8';

        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role
            },
            jwtSecret,
            { expiresIn: '8h' }
        );

        console.log(`Successful login for ${sanitizedEmail} from ${clientIP}`);

        return NextResponse.json({ token, expiresIn: `${sessionTimeout}h` });
    } catch (err) {
        console.error('Authentication error:', err);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
