import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { checkRateLimit, sanitizeInput, getClientIp } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const clientIP = getClientIp(request);

    // Rate limit: 5 attempts per 15 minutes per IP
    if (!checkRateLimit(`reset-confirm-${clientIP}`, 5, 900000)) {
        return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { token, userId, newPassword } = body;

    if (!token || !userId || !newPassword) {
        return NextResponse.json({ error: 'Token, user ID, and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    if (newPassword.length > 128) {
        return NextResponse.json({ error: 'Password too long' }, { status: 400 });
    }

    const jwtSecret = process.env.NEXTAUTH_SECRET;
    if (!jwtSecret || jwtSecret === 'dev-secret') {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const user = await prisma.adminUser.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
        }

        // Verify token using the password-specific secret (invalidates after use/password change)
        const resetSecret = `${jwtSecret}-${user.hashedPassword}`;
        let decoded: any;
        try {
            decoded = jwt.verify(token, resetSecret);
        } catch {
            return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
        }

        if (decoded.type !== 'password_reset' || decoded.sub !== userId) {
            return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 });
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.adminUser.update({
            where: { id: userId },
            data: { hashedPassword },
        });

        console.log(`Password reset successfully for user ${user.email}`);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Password reset error:', err);
        return NextResponse.json({ error: 'Password reset failed' }, { status: 500 });
    }
}
