import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/audit-log?before=<ISO date>&action=<prefix>
 *
 * Newest first, 100 per page. Pass the last entry's createdAt as `before` for
 * the next page.
 */
export async function GET(request: Request) {
    try {
        await requireAdmin(request);
    } catch (err) {
        const status = err instanceof AdminAuthError ? 401 : 500;
        return NextResponse.json({ error: 'Unauthorized' }, { status });
    }

    const url = new URL(request.url);
    const before = url.searchParams.get('before');
    const action = url.searchParams.get('action');
    const beforeDate = before ? new Date(before) : null;

    const entries = await prisma.adminAuditLog.findMany({
        where: {
            ...(beforeDate && !isNaN(beforeDate.getTime()) ? { createdAt: { lt: beforeDate } } : {}),
            ...(action ? { action: { startsWith: action.slice(0, 100) } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    return NextResponse.json({ entries });
}
