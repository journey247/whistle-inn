import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { SITE_URL } from '@/config/property';
import { getProperty } from '@/lib/property';
import { formatAddress } from '@/lib/property-schema';

/**
 * Post-stay follow-up: the day after checkout, thank the guest, ask for a
 * review, and give them a single-use discount to book direct next time.
 *
 * Repeat guests booking direct is the cheapest booking an owner gets — this
 * is the built-in marketing that makes a direct site pay for itself.
 *
 * Off unless `followup_enabled` is "true". It is a marketing email, so it
 * carries the property's postal address and an unsubscribe link (CAN-SPAM),
 * and guests who unsubscribed are skipped.
 */

export const FOLLOWUP_KEYS = {
    enabled: 'followup_enabled',
    couponPercent: 'followup_coupon_percent',
    reviewUrl: 'review_url',
} as const;

export type FollowupSettings = {
    enabled: boolean;
    /** 0 = no return-stay coupon. */
    couponPercent: number;
    /** Google/TripAdvisor review link; empty = no review request. */
    reviewUrl: string;
};

export async function getFollowupSettings(): Promise<FollowupSettings> {
    const blocks = await prisma.contentBlock.findMany({
        where: { key: { in: Object.values(FOLLOWUP_KEYS) } },
        select: { key: true, value: true },
    });
    const byKey = Object.fromEntries(blocks.map(b => [b.key, b.value.trim()]));
    const pct = parseFloat(byKey[FOLLOWUP_KEYS.couponPercent] ?? '');
    const url = byKey[FOLLOWUP_KEYS.reviewUrl] ?? '';
    return {
        enabled: byKey[FOLLOWUP_KEYS.enabled] === 'true',
        couponPercent: Number.isFinite(pct) && pct >= 0 && pct <= 50 ? pct : 10,
        reviewUrl: /^https:\/\//.test(url) ? url : '',
    };
}

// ── Unsubscribe links ────────────────────────────────────────────────────────

function unsubscribeSecret(): string | null {
    return process.env.NEXTAUTH_SECRET?.trim() || process.env.CRON_SECRET?.trim() || null;
}

function sign(email: string, secret: string): string {
    return createHmac('sha256', secret).update(`unsubscribe:${email.toLowerCase()}`).digest('hex');
}

export function unsubscribeUrl(email: string): string | null {
    const secret = unsubscribeSecret();
    if (!secret) return null;
    const e = email.toLowerCase();
    return `${SITE_URL}/unsubscribe?e=${encodeURIComponent(e)}&t=${sign(e, secret)}`;
}

export function verifyUnsubscribe(email: string, token: string): boolean {
    const secret = unsubscribeSecret();
    if (!secret || !email || !/^[0-9a-f]{64}$/.test(token)) return false;
    const expected = Buffer.from(sign(email, secret), 'hex');
    return timingSafeEqual(expected, Buffer.from(token, 'hex'));
}

// ── The daily job ────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
/** Only stays that ended in this window get a follow-up, so turning the feature on never emails old guests. */
const WINDOW_DAYS = 7;
const BATCH = 25;

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function createReturnCoupon(percent: number): Promise<string> {
    const code = `BACK-${randomBytes(4).toString('hex').toUpperCase()}`;
    await prisma.coupon.create({
        data: {
            code,
            discountType: 'PERCENT',
            value: percent,
            validUntil: new Date(Date.now() + 365 * DAY),
            maxUses: 1,
        },
    });
    return code;
}

export type FollowupRun = { enabled: boolean; sent: number; skipped: number; failed: number };

export async function sendDueFollowups(now = new Date()): Promise<FollowupRun> {
    const settings = await getFollowupSettings();
    if (!settings.enabled) return { enabled: false, sent: 0, skipped: 0, failed: 0 };

    const property = await getProperty();
    const due = await prisma.booking.findMany({
        where: {
            status: 'paid',
            followupSentAt: null,
            endDate: { lte: new Date(now.getTime() - DAY), gte: new Date(now.getTime() - WINDOW_DAYS * DAY) },
        },
        select: { id: true, email: true, guestName: true },
        orderBy: { endDate: 'asc' },
        take: BATCH,
    });

    let sent = 0, skipped = 0, failed = 0;
    for (const booking of due) {
        const email = booking.email.toLowerCase();
        const [optedOut, link] = await Promise.all([
            prisma.emailOptOut.findUnique({ where: { email } }),
            Promise.resolve(unsubscribeUrl(email)),
        ]);

        // No unsubscribe link means no lawful marketing email; mark it handled
        // either way so the guest is never emailed late or twice.
        if (optedOut || !link) {
            await prisma.booking.update({ where: { id: booking.id }, data: { followupSentAt: now } });
            skipped++;
            continue;
        }

        try {
            // Claim the booking first so a concurrent run cannot send twice.
            const claimed = await prisma.booking.updateMany({
                where: { id: booking.id, followupSentAt: null },
                data: { followupSentAt: now },
            });
            if (claimed.count === 0) continue;

            const firstName = escapeHtml(booking.guestName.split(' ')[0] || 'there');
            const coupon = settings.couponPercent > 0 ? await createReturnCoupon(settings.couponPercent) : null;

            await sendEmail({
                to: booking.email,
                bookingId: booking.id,
                templateName: 'post_stay_followup',
                variables: {
                    guestName: firstName,
                    couponCode: coupon ?? '',
                    couponPercent: settings.couponPercent,
                    reviewUrl: settings.reviewUrl,
                    bookUrl: SITE_URL,
                    unsubscribeUrl: link,
                },
                fallbackSubject: `Thank you for staying at ${property.name}`,
                fallbackHtml: `
                    <p>Hi ${firstName},</p>
                    <p>Thank you for staying with us at <strong>${escapeHtml(property.name)}</strong>. We hope you had a wonderful time.</p>
                    ${settings.reviewUrl ? `<p>If you have a minute, a short review helps other guests find us: <a href="${escapeHtml(settings.reviewUrl)}">leave a review</a>.</p>` : ''}
                    ${coupon ? `<p>Come back any time — book direct at <a href="${SITE_URL}">${SITE_URL.replace(/^https?:\/\//, '')}</a> with code <strong>${coupon}</strong> for ${settings.couponPercent}% off your next stay. It's good for one booking in the next 12 months.</p>` : `<p>We'd love to host you again — book direct at <a href="${SITE_URL}">${SITE_URL.replace(/^https?:\/\//, '')}</a>.</p>`}
                    <p>Warmly,<br>${escapeHtml(property.hostName)} &amp; the ${escapeHtml(property.name)} team</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
                    <p style="color:#94a3b8;font-size:12px">${escapeHtml(property.name)} · ${escapeHtml(formatAddress(property.address))}<br>
                    You're receiving this because you stayed with us. <a href="${link}" style="color:#94a3b8">Unsubscribe</a> from offers like this.</p>
                `,
            });
            sent++;
        } catch (err) {
            console.error(`[Follow-up] Failed for booking ${booking.id}:`, err);
            failed++;
        }
    }

    return { enabled: true, sent, skipped, failed };
}
