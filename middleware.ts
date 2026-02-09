import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security middleware for enhanced protection
export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // CORS configuration
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'https://yourdomain.com'
    ];

    const origin = request.headers.get('origin');

    if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: response.headers });
    }

    // Enhanced Content Security Policy
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
        "connect-src 'self' https://api.stripe.com https://*.stripe.com",
        "img-src 'self' data: https: blob:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "frame-src https://js.stripe.com https://hooks.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://checkout.stripe.com",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
    ].join('; ');

    response.headers.set('Content-Security-Policy', csp);

    // Admin panel security
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Add extra security headers for admin pages
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    // API security
    if (request.nextUrl.pathname.startsWith('/api/')) {
        // Validate Content-Type for POST/PUT requests
        if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
            const contentType = request.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // Only allow JSON for most API endpoints (except webhooks)
                if (!request.nextUrl.pathname.includes('/webhook')) {
                    return new NextResponse('Invalid Content-Type', { status: 400 });
                }
            }
        }

        // Rate limiting headers
        response.headers.set('X-RateLimit-Limit', '100');
        response.headers.set('X-RateLimit-Remaining', '99');
    }

    return response;
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        // Match all API routes
        '/api/:path*',
        // Match admin routes
        '/admin/:path*',
        // Skip Next.js internals and static files
        '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
    ],
};