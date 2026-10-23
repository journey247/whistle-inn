/**
 * Launch gate: what must be in place before guests can pay online.
 *
 * Online checkout stays paused, whatever the owner's switch says, until the
 * property is set up, its short-term rental permit and occupancy-tax
 * certificate are entered, occupancy tax is switched on (so it is collected),
 * and a Stripe account that belongs to the owner can take charges. Without
 * that last one, payments would land in the platform's own Stripe account.
 *
 * While the gate is closed the site keeps working as it does with checkout
 * paused: guests send requests and the owner approves them one by one.
 *
 * Kept free of Prisma so the rules can be unit-tested; getLaunchGate() in
 * checkout-settings.ts gathers the inputs.
 */

export type LaunchGateInputs = {
    onboardingComplete: boolean;
    strPermit: string;
    totCertificate: string;
    taxEnabled: boolean;
    stripeChargesEnabled: boolean;
};

export type LaunchGateItem = {
    id: 'setup' | 'strPermit' | 'totCertificate' | 'tax' | 'stripe';
    label: string;
    ok: boolean;
    /** Where in the admin panel the owner fixes it. */
    fix: string;
};

export type LaunchGate = { ready: boolean; items: LaunchGateItem[] };

export function evaluateLaunchGate(i: LaunchGateInputs): LaunchGate {
    const items: LaunchGateItem[] = [
        { id: 'setup', label: 'Property setup finished', ok: i.onboardingComplete, fix: 'Settings → Property' },
        { id: 'strPermit', label: 'Short-term rental permit entered', ok: Boolean(i.strPermit.trim()), fix: 'Settings → Property → Permits' },
        { id: 'totCertificate', label: 'Occupancy tax (TOT) certificate entered', ok: Boolean(i.totCertificate.trim()), fix: 'Settings → Property → Permits' },
        { id: 'tax', label: 'Occupancy tax collection turned on', ok: i.taxEnabled, fix: 'Settings → Pricing → Occupancy Tax' },
        { id: 'stripe', label: 'Stripe account connected and able to take payments', ok: i.stripeChargesEnabled, fix: 'Settings → Pricing → Payments' },
    ];
    return { ready: items.every(item => item.ok), items };
}
