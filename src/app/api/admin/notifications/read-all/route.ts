import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Mark all notifications as read
export async function POST(request: Request) {
  try {
    const admin = verifyAdmin(request);

    const result = await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true, readAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count
    });
  } catch (error: any) {
    console.error('Mark all read error:', error.message);

    if (error.message.includes('token') || error.message.includes('auth')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }
}