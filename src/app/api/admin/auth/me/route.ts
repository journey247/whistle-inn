import { NextResponse } from 'next/server';
import { requireAdmin, twoFactorRequired } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/auth/me
 *
 * The admin dashboard's session check. The session cookie is httpOnly, so the
 * client cannot inspect it — this endpoint is the only way for the page to know
 * whether it is signed in.
 *
 * Uses requireAdmin so it accepts the same credentials as every other admin
 * route (cookie first, Bearer header as a fallback) and applies the same
 * account-still-exists check. It previously did its own header-only JWT
 * verification, which meant it ignored the session cookie entirely.
 */
export async function GET(request: Request) {
    try {
        // Allowed without 2FA so the page can send such an account to setup
        // when ADMIN_REQUIRE_2FA is on.
        const admin = await requireAdmin(request, { allowWithout2fa: true });
        const user = await prisma.adminUser.findUnique({ where: { id: admin.sub }, select: { totpSecret: true } });
        const twoFactorEnabled = Boolean(user?.totpSecret);
        return NextResponse.json({
            user: { id: admin.sub, email: admin.email, role: admin.role },
            twoFactorEnabled,
            twoFactorSetupRequired: twoFactorRequired() && !twoFactorEnabled,
        });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
