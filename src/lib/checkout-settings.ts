import { prisma } from '@/lib/prisma';
import { PROPERTY } from '@/config/property';

/**
 * Whether guests can pay online, and who to call when they can't.
 *
 * Online checkout is OFF unless `online_checkout_enabled` is exactly "true".
 * Defaulting to paused means a missing or mistyped setting can never reopen
 * payments by accident: while paused, the booking modal records the guest's
 * request for the owner to approve instead of sending them to Stripe.
 */

export const DEFAULT_CONTACT_PHONE = PROPERTY.phone;
export const DEFAULT_CONTACT_NAME = PROPERTY.hostName;

export type CheckoutSettings = {
    onlineCheckoutEnabled: boolean;
    contactName: string;
    contactPhone: string;
};

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
    try {
        const blocks = await prisma.contentBlock.findMany({
            where: { key: { in: ['online_checkout_enabled', 'booking_contact_phone', 'booking_contact_name'] } },
            select: { key: true, value: true },
        });
        const byKey = Object.fromEntries(blocks.map(b => [b.key, b.value.trim()]));

        return {
            onlineCheckoutEnabled: byKey.online_checkout_enabled === 'true',
            contactName: byKey.booking_contact_name || DEFAULT_CONTACT_NAME,
            contactPhone: byKey.booking_contact_phone || DEFAULT_CONTACT_PHONE,
        };
    } catch (error) {
        console.error('Failed to load checkout settings — treating checkout as paused:', error);
        return {
            onlineCheckoutEnabled: false,
            contactName: DEFAULT_CONTACT_NAME,
            contactPhone: DEFAULT_CONTACT_PHONE,
        };
    }
}
