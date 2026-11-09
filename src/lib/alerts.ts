import { prisma } from './prisma';
import { sendEmail } from './email';

/**
 * Alerts that need a person: a channel booking that overlaps a direct one, a
 * failing cron or webhook.
 *
 * Each alert has a `key`. One with the same key inside `repeatAfterHours` is
 * skipped, so a problem that persists across many 15-minute runs produces one
 * email, not ninety-six a day. Every alert is also stored as an in-app
 * notification, which is what the admin panel's bell shows and what the
 * dedupe reads.
 *
 * Never throws: alerting is the last thing that should break the job that is
 * reporting a problem.
 */

export type AlertAudience = 'owner' | 'ops';

export interface Alert {
    key: string;
    type: 'booking_conflict' | 'system_failure';
    title: string;
    /** Plain text. Escaped before it goes into the email's HTML. */
    message: string;
    audience: AlertAudience[];
    /** Send again after this long if it is still happening. Omit to send once, ever. */
    repeatAfterHours?: number;
}

/** The owner's address (from the admin settings), and ours for platform problems. */
function recipients(audience: AlertAudience[]): string[] {
    const to = new Set<string>();
    if (audience.includes('owner') && process.env.ADMIN_EMAIL) to.add(process.env.ADMIN_EMAIL);
    if (audience.includes('ops') && process.env.OPS_ALERT_EMAIL) to.add(process.env.OPS_ALERT_EMAIL);
    return [...to];
}

export function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** Returns true if the alert was sent, false if a recent one already covered it. */
export async function alertOnce(alert: Alert): Promise<boolean> {
    try {
        const since = alert.repeatAfterHours
            ? new Date(Date.now() - alert.repeatAfterHours * 60 * 60 * 1000)
            : undefined;
        const recent = await prisma.notification.findFirst({
            where: {
                type: alert.type,
                data: { path: ['key'], equals: alert.key },
                ...(since ? { createdAt: { gte: since } } : {}),
            },
            select: { id: true },
        });
        if (recent) return false;

        const to = recipients(alert.audience);
        await prisma.notification.create({
            data: {
                type: alert.type,
                title: alert.title,
                message: alert.message,
                recipientEmail: to[0] ?? null,
                data: { key: alert.key, audience: alert.audience },
                read: false,
            },
        });

        for (const address of to) {
            await sendEmail({
                to: address,
                subject: alert.title,
                body: `<p>${escapeHtml(alert.message).replace(/\n/g, '<br>')}</p>`,
            }).catch(err => console.error(`[alerts] Email to ${address} failed:`, err));
        }
        if (to.length === 0) {
            console.warn(`[alerts] No address configured for ${alert.audience.join('+')} — "${alert.title}" is in-app only`);
        }
        return true;
    } catch (err) {
        console.error('[alerts] Could not record alert', alert.key, err);
        return false;
    }
}

/**
 * Tell us a scheduled job or webhook failed.
 *
 * One email per `source` every 6 hours while it keeps failing. The error text
 * goes to ops only: it can name internals an owner has no use for.
 */
export async function reportFailure(source: string, error: unknown): Promise<void> {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[${source}] failed:`, error);
    await alertOnce({
        key: `failure:${source}`,
        type: 'system_failure',
        title: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'Site'}: ${source} is failing`,
        message: `${source} failed at ${new Date().toISOString()}.\n\n${detail.slice(0, 1000)}\n\nYou will not be emailed about this again for 6 hours while it keeps failing.`,
        audience: ['ops'],
        repeatAfterHours: 6,
    });
}
