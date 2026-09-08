import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/auth/logout
 *
 * Clears the session cookie. Needed because the cookie is httpOnly and so
 * cannot be removed by client-side script.
 *
 * Deliberately unauthenticated: logging out is safe for anyone to invoke, and
 * requiring a valid session would make it impossible to clear an expired one.
 */
export async function POST() {
    const response = NextResponse.json({ success: true });
    response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
    });
    return response;
}
