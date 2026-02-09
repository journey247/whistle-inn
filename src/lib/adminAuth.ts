import jwt from 'jsonwebtoken';

// Secure JWT verification with proper error handling and validation
export function verifyAdmin(request: Request) {
    const auth = request.headers.get('authorization');

    if (!auth || !auth.startsWith('Bearer ')) {
        throw new Error('Missing or invalid authorization header');
    }

    const token = auth.replace('Bearer ', '');

    // Ensure JWT secret is configured
    const jwtSecret = process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
        console.error('CRITICAL: JWT secret not configured');
        throw new Error('Server configuration error');
    }

    if (jwtSecret === 'dev-secret') {
        console.error('CRITICAL: Using insecure dev-secret in production');
        throw new Error('Server configuration error');
    }

    try {
        const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

        // Validate token structure
        if (!decoded.sub || !decoded.email || !decoded.role) {
            throw new Error('Invalid token structure');
        }

        // Check if token is expired (additional safety)
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            throw new Error('Token expired');
        }

        return decoded;
    } catch (err) {
        if (err instanceof jwt.JsonWebTokenError) {
            console.warn('JWT verification failed:', err.message);
            throw new Error('Invalid token');
        }
        throw new Error('Authentication failed');
    }
}

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 60000) {
    const now = Date.now();
    const key = identifier;
    const current = rateLimitStore.get(key);

    if (!current || now - current.timestamp > windowMs) {
        rateLimitStore.set(key, { count: 1, timestamp: now });
        return true;
    }

    if (current.count >= maxRequests) {
        return false;
    }

    current.count++;
    return true;
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
