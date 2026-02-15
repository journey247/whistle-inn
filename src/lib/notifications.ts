import { prisma } from './prisma';
import { sendEmail } from './email';
import { sendSMS } from './sms';

export enum NotificationType {
  BOOKING_CREATED = 'booking_created',
  BOOKING_CANCELLED = 'booking_cancelled',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  ADMIN_PRICE_CHANGE = 'admin_price_change',
  ADMIN_COUPON_CHANGE = 'admin_coupon_change',
  SYSTEM_MAINTENANCE = 'system_maintenance',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export interface NotificationData {
  bookingId?: string;
  booking?: any;
  amount?: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guestCount?: number;
  oldValue?: any;
  newValue?: any;
  adminUser?: string;
  message?: string;
}

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  userId?: string;
  name?: string;
}

/**
 * Send a notification through multiple channels
 */
export async function sendNotification(
  type: NotificationType,
  channels: NotificationChannel[],
  recipient: NotificationRecipient,
  data: NotificationData
) {
  const promises: Promise<any>[] = [];

  // Send email notification
  if (channels.includes(NotificationChannel.EMAIL) && recipient.email) {
    promises.push(sendEmailNotification(type, recipient, data));
  }

  // Send SMS notification
  if (channels.includes(NotificationChannel.SMS) && recipient.phone) {
    promises.push(sendSMSNotification(type, recipient, data));
  }

  // Store in-app notification
  if (channels.includes(NotificationChannel.IN_APP)) {
    promises.push(storeInAppNotification(type, recipient, data));
  }

  // Execute all notifications in parallel
  const results = await Promise.allSettled(promises);

  // Log results
  results.forEach((result, index) => {
    const channel = channels[index];
    if (result.status === 'rejected') {
      console.error(`Failed to send ${channel} notification for ${type}:`, result.reason);
    } else {
      console.log(`Successfully sent ${channel} notification for ${type}`);
    }
  });

  // Log the notification event
  await logNotificationEvent(type, channels, recipient, data, results);
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  type: NotificationType,
  recipient: NotificationRecipient,
  data: NotificationData
) {
  const { subject, html, text } = generateEmailContent(type, recipient, data);

  await sendEmail({
    to: recipient.email!,
    subject,
    body: html,
  });
}

/**
 * Send SMS notification
 */
async function sendSMSNotification(
  type: NotificationType,
  recipient: NotificationRecipient,
  data: NotificationData
) {
  const message = generateSMSContent(type, recipient, data);

  await sendSMS({
    to: recipient.phone!,
    message,
  });
}

/**
 * Store in-app notification
 */
async function storeInAppNotification(
  type: NotificationType,
  recipient: NotificationRecipient,
  data: NotificationData
) {
  await prisma.notification.create({
    data: {
      type,
      title: getNotificationTitle(type),
      message: generateInAppContent(type, recipient, data),
      recipientEmail: recipient.email,
      recipientPhone: recipient.phone,
      recipientUserId: recipient.userId,
      data: data as any,
      read: false,
    }
  });
}

/**
 * Log notification event for analytics
 */
async function logNotificationEvent(
  type: NotificationType,
  channels: NotificationChannel[],
  recipient: NotificationRecipient,
  data: NotificationData,
  results: PromiseSettledResult<any>[]
) {
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failureCount = results.filter(r => r.status === 'rejected').length;

  await prisma.notificationLog.create({
    data: {
      type,
      channels: channels.join(','),
      recipientEmail: recipient.email,
      recipientPhone: recipient.phone,
      recipientUserId: recipient.userId,
      data: data as any,
      successCount,
      failureCount,
      sentAt: new Date(),
    }
  });
}

/**
 * Generate email content based on notification type
 */
function generateEmailContent(
  type: NotificationType,
  recipient: NotificationRecipient,
  data: NotificationData
): { subject: string; html: string; text: string } {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  switch (type) {
    case NotificationType.BOOKING_CREATED:
      return {
        subject: `New Booking Confirmation - ${data.checkInDate} to ${data.checkOutDate}`,
        html: `
          <h2>New Booking Received!</h2>
          <p>Dear ${recipient.name || 'Property Owner'},</p>
          <p>You have received a new booking for Whistle Inn:</p>
          <ul>
            <li><strong>Guest:</strong> ${data.customerName}</li>
            <li><strong>Email:</strong> ${data.customerEmail}</li>
            <li><strong>Check-in:</strong> ${data.checkInDate}</li>
            <li><strong>Check-out:</strong> ${data.checkOutDate}</li>
            <li><strong>Guests:</strong> ${data.guestCount}</li>
            <li><strong>Total:</strong> $${data.amount}</li>
          </ul>
          <p><a href="${baseUrl}/admin">View in Admin Dashboard</a></p>
          <p>Please confirm availability and contact the guest if needed.</p>
        `,
        text: `New booking received: ${data.customerName} (${data.customerEmail}) for ${data.checkInDate} to ${data.checkOutDate}. Total: $${data.amount}. View: ${baseUrl}/admin`
      };

    case NotificationType.BOOKING_CANCELLED:
      return {
        subject: `Booking Cancelled - ${data.checkInDate} to ${data.checkOutDate}`,
        html: `
          <h2>Booking Cancelled</h2>
          <p>Dear ${recipient.name || 'Property Owner'},</p>
          <p>A booking has been cancelled:</p>
          <ul>
            <li><strong>Guest:</strong> ${data.customerName}</li>
            <li><strong>Check-in:</strong> ${data.checkInDate}</li>
            <li><strong>Check-out:</strong> ${data.checkOutDate}</li>
          </ul>
          <p>The dates are now available for new bookings.</p>
          <p><a href="${baseUrl}/admin">View in Admin Dashboard</a></p>
        `,
        text: `Booking cancelled: ${data.customerName} for ${data.checkInDate} to ${data.checkOutDate}. View: ${baseUrl}/admin`
      };

    case NotificationType.PAYMENT_SUCCESS:
      return {
        subject: `Payment Confirmed - $${data.amount}`,
        html: `
          <h2>Payment Successful!</h2>
          <p>Dear ${recipient.name || 'Property Owner'},</p>
          <p>A payment has been successfully processed:</p>
          <ul>
            <li><strong>Amount:</strong> $${data.amount}</li>
            <li><strong>Guest:</strong> ${data.customerName}</li>
            <li><strong>Booking:</strong> ${data.checkInDate} to ${data.checkOutDate}</li>
          </ul>
          <p>The booking is now confirmed and paid.</p>
          <p><a href="${baseUrl}/admin">View in Admin Dashboard</a></p>
        `,
        text: `Payment confirmed: $${data.amount} from ${data.customerName} for ${data.checkInDate} to ${data.checkOutDate}. View: ${baseUrl}/admin`
      };

    case NotificationType.PAYMENT_FAILED:
      return {
        subject: `Payment Failed - Action Required`,
        html: `
          <h2>Payment Failed</h2>
          <p>Dear ${recipient.name || 'Property Owner'},</p>
          <p>A payment attempt has failed:</p>
          <ul>
            <li><strong>Amount:</strong> $${data.amount}</li>
            <li><strong>Guest:</strong> ${data.customerName}</li>
            <li><strong>Booking:</strong> ${data.checkInDate} to ${data.checkOutDate}</li>
          </ul>
          <p>Please contact the guest to resolve the payment issue.</p>
          <p><a href="${baseUrl}/admin">View in Admin Dashboard</a></p>
        `,
        text: `Payment failed: $${data.amount} from ${data.customerName} for ${data.checkInDate} to ${data.checkOutDate}. Action required. View: ${baseUrl}/admin`
      };

    case NotificationType.ADMIN_PRICE_CHANGE:
      return {
        subject: `Pricing Updated`,
        html: `
          <h2>Pricing Configuration Changed</h2>
          <p>Dear ${recipient.name || 'Admin'},</p>
          <p>The pricing has been updated:</p>
          <ul>
            <li><strong>Changed by:</strong> ${data.adminUser || 'System'}</li>
            <li><strong>Old value:</strong> ${data.oldValue}</li>
            <li><strong>New value:</strong> ${data.newValue}</li>
          </ul>
          <p>All new quotes will reflect this change.</p>
        `,
        text: `Pricing updated: ${data.oldValue} → ${data.newValue} by ${data.adminUser || 'System'}`
      };

    default:
      return {
        subject: `Whistle Inn Notification`,
        html: `<p>${data.message || 'You have a new notification.'}</p>`,
        text: data.message || 'You have a new notification.'
      };
  }
}

/**
 * Generate SMS content
 */
function generateSMSContent(
  type: NotificationType,
  recipient: NotificationRecipient,
  data: NotificationData
): string {
  switch (type) {
    case NotificationType.BOOKING_CREATED:
      return `New booking: ${data.customerName} for ${data.checkInDate} to ${data.checkOutDate}. $${data.amount}. Check admin dashboard.`;

    case NotificationType.BOOKING_CANCELLED:
      return `Booking cancelled: ${data.customerName} for ${data.checkInDate} to ${data.checkOutDate}. Dates now available.`;

    case NotificationType.PAYMENT_SUCCESS:
      return `Payment confirmed: $${data.amount} from ${data.customerName} for ${data.checkInDate}-${data.checkOutDate}.`;

    case NotificationType.PAYMENT_FAILED:
      return `Payment failed: $${data.amount} from ${data.customerName}. Contact guest to resolve.`;

    case NotificationType.ADMIN_PRICE_CHANGE:
      return `Pricing updated: ${data.oldValue} → ${data.newValue}`;

    default:
      return data.message || 'New notification received.';
  }
}

/**
 * Generate in-app notification content
 */
function generateInAppContent(
  type: NotificationType,
  recipient: NotificationRecipient,
  data: NotificationData
): string {
  switch (type) {
    case NotificationType.BOOKING_CREATED:
      return `New booking from ${data.customerName} (${data.checkInDate} to ${data.checkOutDate}) - $${data.amount}`;

    case NotificationType.BOOKING_CANCELLED:
      return `Booking cancelled by ${data.customerName} (${data.checkInDate} to ${data.checkOutDate})`;

    case NotificationType.PAYMENT_SUCCESS:
      return `Payment confirmed: $${data.amount} from ${data.customerName}`;

    case NotificationType.PAYMENT_FAILED:
      return `Payment failed: $${data.amount} from ${data.customerName} - Action required`;

    case NotificationType.ADMIN_PRICE_CHANGE:
      return `Pricing updated: ${data.oldValue} → ${data.newValue}`;

    default:
      return data.message || 'New notification';
  }
}

/**
 * Get notification title for in-app display
 */
function getNotificationTitle(type: NotificationType): string {
  switch (type) {
    case NotificationType.BOOKING_CREATED:
      return 'New Booking';
    case NotificationType.BOOKING_CANCELLED:
      return 'Booking Cancelled';
    case NotificationType.PAYMENT_SUCCESS:
      return 'Payment Confirmed';
    case NotificationType.PAYMENT_FAILED:
      return 'Payment Failed';
    case NotificationType.ADMIN_PRICE_CHANGE:
      return 'Pricing Updated';
    case NotificationType.ADMIN_COUPON_CHANGE:
      return 'Coupon Updated';
    case NotificationType.SYSTEM_MAINTENANCE:
      return 'System Notice';
    default:
      return 'Notification';
  }
}

/**
 * Get admin notification preferences
 */
export async function getAdminNotificationPreferences() {
  // For now, return default preferences
  // In the future, this could be configurable per admin user
  return {
    email: true,
    sms: true,
    inApp: true,
  };
}

/**
 * Send notification to admin for booking events
 */
export async function notifyAdminOfBooking(
  type: NotificationType,
  booking: any
) {
  const preferences = await getAdminNotificationPreferences();

  const channels: NotificationChannel[] = [];
  if (preferences.email) channels.push(NotificationChannel.EMAIL);
  if (preferences.sms) channels.push(NotificationChannel.SMS);
  if (preferences.inApp) channels.push(NotificationChannel.IN_APP);

  // Get admin contact info from environment or database
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPhone = process.env.ADMIN_PHONE;
  const adminName = process.env.ADMIN_NAME || 'Property Owner';

  if (!adminEmail && !adminPhone) {
    console.warn('No admin contact information configured for notifications');
    return;
  }

  const recipient: NotificationRecipient = {
    email: adminEmail,
    phone: adminPhone,
    name: adminName,
  };

  const data: NotificationData = {
    bookingId: booking.id,
    booking,
    amount: booking.totalPrice,
    currency: 'usd',
    customerEmail: booking.email,
    customerName: booking.guestName,
    checkInDate: booking.startDate.toISOString().split('T')[0],
    checkOutDate: booking.endDate.toISOString().split('T')[0],
    guestCount: booking.guestCount,
  };

  await sendNotification(type, channels, recipient, data);
}

/**
 * Send notification to admin for payment events
 */
export async function notifyAdminOfPayment(
  type: NotificationType,
  booking: any,
  amount: number
) {
  const preferences = await getAdminNotificationPreferences();

  const channels: NotificationChannel[] = [];
  if (preferences.email) channels.push(NotificationChannel.EMAIL);
  if (preferences.sms) channels.push(NotificationChannel.SMS);
  if (preferences.inApp) channels.push(NotificationChannel.IN_APP);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPhone = process.env.ADMIN_PHONE;
  const adminName = process.env.ADMIN_NAME || 'Property Owner';

  const recipient: NotificationRecipient = {
    email: adminEmail,
    phone: adminPhone,
    name: adminName,
  };

  const data: NotificationData = {
    bookingId: booking.id,
    booking,
    amount,
    currency: 'usd',
    customerEmail: booking.email,
    customerName: booking.guestName,
    checkInDate: booking.startDate.toISOString().split('T')[0],
    checkOutDate: booking.endDate.toISOString().split('T')[0],
    guestCount: booking.guestCount,
  };

  await sendNotification(type, channels, recipient, data);
}

/**
 * Send notification to admin for admin actions
 */
export async function notifyAdminOfChange(
  type: NotificationType,
  oldValue: any,
  newValue: any,
  adminUser?: string
) {
  const preferences = await getAdminNotificationPreferences();

  const channels: NotificationChannel[] = [];
  if (preferences.inApp) channels.push(NotificationChannel.IN_APP);
  // Admin changes typically don't need email/SMS to avoid spam

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  const recipient: NotificationRecipient = {
    email: adminEmail,
    name: adminName,
  };

  const data: NotificationData = {
    oldValue: String(oldValue),
    newValue: String(newValue),
    adminUser: adminUser || 'System',
  };

  await sendNotification(type, channels, recipient, data);
}