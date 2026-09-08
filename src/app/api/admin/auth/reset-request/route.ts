import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { checkRateLimit, sanitizeInput, validateEmail, getClientIp } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 're_placeholder');
}

export async function POST(request: Request) {
    const clientIP = getClientIp(request);

    // Rate limit: 3 reset requests per 15 minutes per IP
    if (!checkRateLimit(`reset-${clientIP}`, 3, 900000)) {
        return NextResponse.json({ error: 'Too many reset requests. Try again later.' }, { status: 429 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { email } = body;
    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const sanitizedEmail = sanitizeInput(email, 254).toLowerCase();
    if (!validateEmail(sanitizedEmail)) {
        // Return success anyway to avoid email enumeration
        return NextResponse.json({ success: true });
    }

    const jwtSecret = process.env.NEXTAUTH_SECRET;
    if (!jwtSecret || jwtSecret === 'dev-secret') {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const user = await prisma.adminUser.findUnique({ where: { email: sanitizedEmail } });

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({ success: true });
        }

        // Sign a short-lived reset token using the user's hashed password as part of the secret
        // This means the token is invalidated once the password changes
        const resetSecret = `${jwtSecret}-${user.hashedPassword}`;
        const resetToken = jwt.sign(
            { sub: user.id, email: user.email, type: 'password_reset' },
            resetSecret,
            { expiresIn: '1h' }
        );

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thewhistleinn.com';
        const resetUrl = `${baseUrl}/admin/reset-password?token=${resetToken}&id=${user.id}`;

        const from = process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL || 'noreply@thewhistleinn.com';

        await getResend().emails.send({
            from,
            to: sanitizedEmail,
            subject: 'Whistle Inn Admin — Password Reset',
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
                    <h2 style="color: #0f172a;">Reset Your Password</h2>
                    <p style="color: #475569;">Click the button below to reset your Whistle Inn admin password. This link expires in <strong>1 hour</strong>.</p>
                    <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#d4a017;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
                        Reset Password
                    </a>
                    <p style="color:#94a3b8;font-size:12px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
                </div>
            `,
        });

        console.log(`Password reset email sent to ${sanitizedEmail}`);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Password reset request error:', err);
        // Still return success to avoid leaking information
        return NextResponse.json({ success: true });
    }
}
