import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';
import bcrypt from 'bcryptjs';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const admin = verifyAdmin(request);

        // Prevent deleting self (using 'sub' claim from JWT)
        if (admin.sub === params.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        await prisma.adminUser.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized or Error' }, { status: 401 });
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        verifyAdmin(request);
        const { password, role } = await request.json();

        const data: any = {};
        if (password) {
            data.hashedPassword = await bcrypt.hash(password, 10);
        }
        if (role) {
            data.role = role;
        }

        const updated = await prisma.adminUser.update({
            where: { id: params.id },
            data,
            select: { id: true, email: true, role: true }
        });
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
