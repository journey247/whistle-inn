import { prisma } from '@/lib/prisma';
import { getProperty } from '@/lib/property';
import { getTaxSettings } from '@/lib/pricing-server';
import { getConnectState } from '@/lib/stripe';
import { evaluateLaunchGate, type LaunchGate } from '@/lib/launch-gate';

/**
 * Whether guests can pay online, and who to call when they can't.
 *
 * Online checkout is OFF unless `online_checkout_enabled` is exactly "true"
 * AND the launch gate is open (see launch-gate.ts). Defaulting to paused means
 * a missing or mistyped setting can never reopen payments by accident: while
 * paused, the booking modal records the guest's request for the owner to
 * approve instead of sending them to Stripe.
 */

/** The launch gate, from live settings. Fails closed: any read error keeps it shut. */
export async function getLaunchGate(): Promise<LaunchGate> {
    try {
        const [property, tax, connect] = await Promise.all([getProperty(), getTaxSettings(), getConnectState()]);
        return evaluateLaunchGate({
            onboardingComplete: Boolean(property.onboardingCompletedAt),
            strPermit: property.permits.strPermit,
            totCertificate: property.permits.totCertificate,
            taxEnabled: tax.enabled,
            stripeChargesEnabled: connect.chargesEnabled,
        });
    } catch (error) {
        console.error('Failed to evaluate the launch gate — keeping checkout paused:', error);
        return evaluateLaunchGate({
            onboardingComplete: false, strPermit: '', totCertificate: '', taxEnabled: false, stripeChargesEnabled: false,
        });
    }
}

export type CheckoutSettings = {
    /** Guests can pay online now: the owner's switch is on and the launch gate is open. */
    onlineCheckoutEnabled: boolean;
    /** The owner's switch alone, for the admin panel. */
    onlineCheckoutSwitchedOn: boolean;
    contactName: string;
    contactPhone: string;
};

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
    // The property's host and phone, unless the owner set a separate booking contact.
    const property = await getProperty();
    const DEFAULT_CONTACT_NAME = property.hostName;
    const DEFAULT_CONTACT_PHONE = property.phone;

    try {
        const blocks = await prisma.contentBlock.findMany({
            where: { key: { in: ['online_checkout_enabled', 'booking_contact_phone', 'booking_contact_name'] } },
            select: { key: true, value: true },
        });
        const byKey = Object.fromEntries(blocks.map(b => [b.key, b.value.trim()]));
        const switchedOn = byKey.online_checkout_enabled === 'true';

        return {
            onlineCheckoutEnabled: switchedOn && (await getLaunchGate()).ready,
            onlineCheckoutSwitchedOn: switchedOn,
            contactName: byKey.booking_contact_name || DEFAULT_CONTACT_NAME,
            contactPhone: byKey.booking_contact_phone || DEFAULT_CONTACT_PHONE,
        };
    } catch (error) {
        console.error('Failed to load checkout settings — treating checkout as paused:', error);
        return {
            onlineCheckoutEnabled: false,
            onlineCheckoutSwitchedOn: false,
            contactName: DEFAULT_CONTACT_NAME,
            contactPhone: DEFAULT_CONTACT_PHONE,
        };
    }
}
