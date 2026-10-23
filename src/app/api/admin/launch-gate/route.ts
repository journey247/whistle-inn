import { NextResponse } from 'next/server';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';
import { getCheckoutSettings, getLaunchGate } from '@/lib/checkout-settings';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/launch-gate
 *
 * What still stands between the owner and taking payments online, plus the
 * state of their checkout switch, for the switch on the Reservations tab.
 */
export async function GET(request: Request) {
    try {
        await requireAdmin(request);
        const [gate, checkout] = await Promise.all([getLaunchGate(), getCheckoutSettings()]);
        return NextResponse.json({
            ...gate,
            switchedOn: checkout.onlineCheckoutSwitchedOn,
            live: checkout.onlineCheckoutEnabled,
            contactPhone: checkout.contactPhone,
        });
    } catch (error) {
        if (error instanceof AdminAuthError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Launch gate error:', error);
        return NextResponse.json({ error: 'Failed to check launch readiness' }, { status: 500 });
    }
}
