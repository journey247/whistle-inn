import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET all notifications for admin
export async function GET(request: Request) {
  try {
    const admin = verifyAdmin(request);

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50 notifications
    });

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error('Notifications fetch error:', error.message);

    if (error.message.includes('token') || error.message.includes('auth')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// Mark all notifications as read
export async function POST(request: Request) {
  try {
    const admin = verifyAdmin(request);
    const { action } = await request.json();

    if (action === 'mark-all-read') {
      await prisma.notification.updateMany({
        where: { read: false },
        data: { read: true, readAt: new Date() }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Notifications update error:', error.message);

    if (error.message.includes('token') || error.message.includes('auth')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}