import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, sanitizeInput, validateEmail } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// One-time admin creation with enhanced security
export async function POST(request: Request) {
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

    // Rate limiting for admin creation attempts
    if (!checkRateLimit(`admin-create-${clientIP}`, 3, 300000)) { // 3 attempts per 5 minutes
        return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    // Use server-side only SETUP_KEY (never NEXT_PUBLIC_*)
    const setupKey = process.env.SETUP_KEY;
    if (!setupKey) {
        console.error('SETUP_KEY not configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { email, password, key } = body;

    // Enhanced input validation
    if (!email || !password || !key) {
        return NextResponse.json({ error: 'Email, password, and key are required' }, { status: 400 });
    }

    try {
        const sanitizedEmail = sanitizeInput(email, 254).toLowerCase();
        const sanitizedKey = sanitizeInput(key, 100);

        if (!validateEmail(sanitizedEmail)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
        }

        // Validate setup key
        if (sanitizedKey !== setupKey) {
            console.warn(`Invalid setup key attempt from ${clientIP}`);
            return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
        }

        // Check if admin already exists
        const existing = await prisma.adminUser.findUnique({ where: { email: sanitizedEmail } });
        if (existing) {
            return NextResponse.json({ error: 'Admin user already exists' }, { status: 400 });
        }

        // Hash password with higher cost for better security
        const hashed = await bcrypt.hash(password, 12);

        const user = await prisma.adminUser.create({
            data: {
                email: sanitizedEmail,
                hashedPassword: hashed,
                role: 'admin'
            }
        });

        console.log(`Admin user created: ${sanitizedEmail} from IP: ${clientIP}`);

        return NextResponse.json({
            success: true,
            user: { id: user.id, email: user.email }
        });
    } catch (err) {
        console.error('Admin creation error:', err);
        return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
    }
}
