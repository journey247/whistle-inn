import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await requireAdmin(request);
        const { id } = await params;

        // Prevent deleting self (using 'sub' claim from JWT)
        if (admin.sub === id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        await prisma.adminUser.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized or Error' }, { status: 401 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(request);
        const { id } = await params;
        const { password, role, resetTwoFactor } = await request.json();

        const data: any = {};
        if (password) {
            data.hashedPassword = await bcrypt.hash(password, 10);
            data.sessionVersion = { increment: 1 };
        }
        // For an admin who lost their phone and recovery codes: turns their
        // 2FA off so they can sign in with the password and set it up again.
        if (resetTwoFactor === true) {
            Object.assign(data, { totpSecret: null, totpPendingSecret: null, totpLastStep: null, recoveryCodes: { set: [] }, sessionVersion: { increment: 1 } });
        }
        if (role) {
            data.role = role;
        }

        const updated = await prisma.adminUser.update({
            where: { id },
            data,
            select: { id: true, email: true, role: true }
        });
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
