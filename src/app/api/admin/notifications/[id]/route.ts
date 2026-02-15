import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Mark notification as read
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = verifyAdmin(request);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() }
    });

    return NextResponse.json(notification);
  } catch (error: any) {
    console.error('Notification update error:', error.message);

    if (error.message.includes('token') || error.message.includes('auth')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// Delete notification
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = verifyAdmin(request);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    await prisma.notification.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notification delete error:', error.message);

    if (error.message.includes('token') || error.message.includes('auth')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}