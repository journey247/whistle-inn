import { NextResponse } from 'next/server';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';
import { getStripe, getConnectState, saveConnectAccountId, saveChargesEnabled } from '@/lib/stripe';
import { SITE_URL } from '@/config/property';
import { getProperty } from '@/lib/property';

export const dynamic = 'force-dynamic';

function authError(error: unknown) {
    return error instanceof AdminAuthError
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : null;
}

/**
 * GET /api/admin/stripe-connect
 *
 * The owner's Stripe account status, refreshed from Stripe so the panel is
 * right even if the account.updated webhook has not arrived yet.
 */
export async function GET(request: Request) {
    try {
        await requireAdmin(request);
        const stripe = getStripe();
        const state = await getConnectState();

        if (!stripe) {
            return NextResponse.json({ configured: false, accountId: state.accountId, chargesEnabled: false, detailsSubmitted: false });
        }
        if (!state.accountId) {
            return NextResponse.json({ configured: true, accountId: null, chargesEnabled: false, detailsSubmitted: false });
        }

        const account = await stripe.accounts.retrieve(state.accountId);
        const chargesEnabled = !!account.charges_enabled;
        if (chargesEnabled !== state.chargesEnabled) {
            await saveChargesEnabled(account.id, chargesEnabled);
        }

        return NextResponse.json({
            configured: true,
            accountId: account.id,
            chargesEnabled,
            payoutsEnabled: !!account.payouts_enabled,
            detailsSubmitted: !!account.details_submitted,
            // Stripe's list of what the owner still has to provide, if anything.
            requirementsDue: account.requirements?.currently_due?.length ?? 0,
        });
    } catch (error) {
        const auth = authError(error);
        if (auth) return auth;
        console.error('Stripe Connect status error:', error);
        return NextResponse.json({ error: 'Could not load Stripe account status' }, { status: 500 });
    }
}

/**
 * POST /api/admin/stripe-connect
 *
 * Start or resume onboarding: create the owner's connected account on first
 * use, then return a one-time Stripe-hosted onboarding link.
 *
 * The account gets the full Stripe Dashboard and pays its own Stripe fees,
 * and Stripe collects its verification details and carries payment losses —
 * the owner runs their own payments, the site provider never holds funds.
 */
export async function POST(request: Request) {
    try {
        const property = await getProperty();
        await requireAdmin(request);
        const stripe = getStripe();
        if (!stripe) {
            return NextResponse.json({ error: 'Stripe is not configured on this site.' }, { status: 503 });
        }

        let { accountId } = await getConnectState();
        if (!accountId) {
            const account = await stripe.accounts.create({
                country: 'US',
                email: property.email,
                business_profile: { name: property.name, url: SITE_URL },
                controller: {
                    stripe_dashboard: { type: 'full' },
                    fees: { payer: 'account' },
                    losses: { payments: 'stripe' },
                    requirement_collection: 'stripe',
                },
            });
            accountId = account.id;
            await saveConnectAccountId(accountId);
        }

        // Send the owner back to the admin they started from (a preview
        // deployment, say), not always to production.
        const origin = request.headers.get('origin') || SITE_URL;
        const link = await stripe.accountLinks.create({
            account: accountId,
            type: 'account_onboarding',
            // Links are single-use and short-lived; refresh_url is hit when an
            // expired one is opened, and the panel simply offers a new one.
            refresh_url: `${origin}/admin?stripe_connect=refresh`,
            return_url: `${origin}/admin?stripe_connect=return`,
        });

        return NextResponse.json({ url: link.url });
    } catch (error) {
        const auth = authError(error);
        if (auth) return auth;
        console.error('Stripe Connect onboarding error:', error);
        const message = (error as any)?.raw?.message || 'Could not start Stripe onboarding';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
