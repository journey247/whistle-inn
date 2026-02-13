# Stripe Setup Guide

This guide will walk you through setting up Stripe for your Whistle Inn vacation rental website.

## 1. Current Configuration Status

Your `.env.local` file has been updated with:
- Stripe Secret Key: ✅ Configured
- Stripe Publishable Key: ✅ Configured
- Stripe Webhook Secret: ❌ Needs to be configured

## 2. Setting Up Webhook Endpoint

To complete your Stripe setup, you need to configure the webhook endpoint in your Stripe dashboard:

### Step 1: Access Your Stripe Dashboard
1. Go to [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"

### Step 2: Configure Webhook Settings
- **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook` (for production)
- **Endpoint URL**: `http://localhost:3000/api/stripe/webhook` (for local development with Stripe CLI)
- **Events to listen to**: Select `checkout.session.completed`

### Step 3: Get Webhook Signing Secret
1. After creating the endpoint, you'll see a signing secret that starts with `whsec_`
2. Copy this secret and update your `.env.local` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
   ```

## 3. Testing Locally with Stripe CLI (Recommended)

For local development, use the Stripe CLI to test webhooks:

### Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (using Chocolatey)
choco install stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

### Connect to Your Account
```bash
stripe login
```

### Listen to Events and Forward to Localhost
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This command will output your webhook signing secret, which you should add to your `.env.local` file.

## 4. Environment Variables Summary

Your `.env.local` file should contain:
```
STRIPE_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 5. Testing Payment Flow

After setting up the webhook:

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Test the booking flow:
   - Select dates on the website
   - Complete the checkout process
   - Verify that successful payments update the booking status in your database
   - Check that confirmation emails are sent

## 6. Going Live

When you're ready to go live:

1. Replace test keys with live keys in your production environment
2. Update the webhook endpoint to use your production URL
3. Make sure to set `NODE_ENV=production` in your production environment

## 7. Troubleshooting

### Webhook Issues
- If webhooks aren't working, check that your server is accessible from the internet
- Verify that the webhook secret matches exactly between your code and Stripe dashboard
- Check server logs for webhook signature verification errors

### Payment Issues
- Ensure your Stripe account is activated and verified
- Check that your payment methods are configured correctly in the Stripe dashboard
- Verify that your pricing configuration matches your business requirements

### Testing Tips
- Use Stripe test card numbers during development:
  - `4242 4242 4242 4242` for successful payments
  - `4000 0000 0000 0002` for declined payments
  - More test cards: https://stripe.com/docs/testing#cards

---

**Note**: Never commit your actual API keys to version control. The `.gitignore` file in this project already excludes `.env.local` files.