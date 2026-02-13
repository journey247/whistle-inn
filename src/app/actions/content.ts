'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/adminAuth';
// Note: We need to verify admin, but server actions don't get request object directly.
// In server actions, we assume we check session/token.
// But adminAuth uses `request.headers.get('authorization')`.
// This architecture relies on JWT passed in headers.
// Since Content Management is protected, I will check the session/cookie if available or pass the token.
// Wait, the current existing admin relies on `verifyAdmin(request)` which reads Authorization header.
// Server actions don't have easy access to Authorization header unless using cookies.

// Let's stick to API Route for now for consistency with existing admin panel auth pattern (JWT in localStorage).
// Creating `src/app/api/admin/content/route.ts` instead.
