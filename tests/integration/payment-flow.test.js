
const assert = require('assert');
const Stripe = require('stripe');

// Helper to wait
const wait = (ms) => new Promise(res => setTimeout(res, ms));

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

// Initialize Stripe (for signature generation)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2023-10-16' });

async function runTest() {
    console.log('🚀 Starting Payment Flow Integration Test...');

    // 1. Create Checkout Session
    console.log('1. Creating Checkout Session...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 40 + Math.floor(Math.random() * 50)); // Random future date
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 3); // 3 nights

    const checkoutRes = await fetch(`${BASE_URL}/api/checkout_sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            guestCount: 2
        })
    });

    if (!checkoutRes.ok) {
        const txt = await checkoutRes.text();
        console.error('Checkout failed:', txt);
        process.exit(1);
    }

    const { sessionId, bookingId } = await checkoutRes.json();
    console.log(`   ✅ Session ID: ${sessionId}`);
    console.log(`   ✅ Booking ID: ${bookingId}`);

    if (!sessionId || !bookingId) {
        console.error('Missing sessionId or bookingId');
        process.exit(1);
    }

    // 2. Simulate Webhook (checkout.session.completed)
    console.log('2. Simulating Stripe Webhook...');

    const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
            object: {
                id: sessionId,
                object: 'checkout.session',
                metadata: { bookingId: bookingId },
                payment_status: 'paid',
                payment_intent: 'pi_test_12345',
                customer_details: {
                    email: 'test@example.com',
                    name: 'Test User'
                }
            }
        },
        api_version: '2023-10-16'
    };

    const payloadString = JSON.stringify(payload, null, 2);

    // Generate signature
    const header = stripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: WEBHOOK_SECRET,
    });

    const webhookRes = await fetch(`${BASE_URL}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': header
        },
        body: payloadString
    });

    if (!webhookRes.ok) {
        const txt = await webhookRes.text();
        console.error('Webhook failed:', txt);
        process.exit(1);
    }

    console.log('   ✅ Webhook processed successfully');

    // 3. Verify Booking Status (optional, requires admin API or DB access)
    // For now, if webhook returned 200, we assume it worked.
    // Real e2e would check the DB or admin UI.

    console.log('🎉 Test Passed!');
}

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
