#!/usr/bin/env node

/**
 * Stripe Configuration Verification Script
 * Run this script to verify your Stripe configuration
 */

const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables directly to avoid truncation issues
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

function verifyStripeConfig() {
    console.log('🔍 Verifying Stripe configuration...\n');

    const issues = [];
    const warnings = [];

    // Check for Stripe secret key
    if (!envConfig.STRIPE_SECRET_KEY) {
        issues.push('❌ STRIPE_SECRET_KEY is not set');
    } else if (envConfig.STRIPE_SECRET_KEY.includes('placeholder') ||
        envConfig.STRIPE_SECRET_KEY.includes('_your_') ||
        envConfig.STRIPE_SECRET_KEY === '' ||
        envConfig.STRIPE_SECRET_KEY === 'sk_test_' ||
        (envConfig.STRIPE_SECRET_KEY.length < 30 && !envConfig.STRIPE_SECRET_KEY.startsWith('sk_test_'))) {
        issues.push('❌ STRIPE_SECRET_KEY contains placeholder value');
    } else {
        console.log('✅ STRIPE_SECRET_KEY is configured');
    }

    // Check for Stripe publishable key
    if (!envConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        issues.push('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    } else if (envConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('placeholder') ||
        envConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('_your_') ||
        envConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === '' ||
        envConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === 'pk_test_' ||
        (envConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.length < 30 && !envConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_'))) {
        issues.push('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY contains placeholder value');
    } else {
        console.log('✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is configured');
    }

    // Check for webhook secret
    if (!envConfig.STRIPE_WEBHOOK_SECRET) {
        warnings.push('⚠️  STRIPE_WEBHOOK_SECRET is not set (required for production)');
    } else if (envConfig.STRIPE_WEBHOOK_SECRET.includes('placeholder') ||
        envConfig.STRIPE_WEBHOOK_SECRET.includes('_your_') ||
        envConfig.STRIPE_WEBHOOK_SECRET.includes('xxxxxx') ||
        envConfig.STRIPE_WEBHOOK_SECRET === '' ||
        envConfig.STRIPE_WEBHOOK_SECRET === 'whsec_' ||
        (envConfig.STRIPE_WEBHOOK_SECRET.length <= 7 && envConfig.STRIPE_WEBHOOK_SECRET.startsWith('whsec_'))) {
        warnings.push('⚠️  STRIPE_WEBHOOK_SECRET contains placeholder value');
    } else {
        console.log('✅ STRIPE_WEBHOOK_SECRET is configured');
    }

    // Check key prefixes
    if (envConfig.STRIPE_SECRET_KEY && !envConfig.STRIPE_SECRET_KEY.startsWith('sk_test_') && !envConfig.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
        warnings.push('⚠️  STRIPE_SECRET_KEY doesn\'t start with sk_test_ or sk_live_ (check format)');
    }

    if (envConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !envConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') && !envConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_')) {
        warnings.push('⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY doesn\'t start with pk_test_ or pk_live_ (check format)');
    }

    if (envConfig.STRIPE_WEBHOOK_SECRET && !envConfig.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
        warnings.push('⚠️  STRIPE_WEBHOOK_SECRET doesn\'t start with whsec_ (check format)');
    }

    // Summary
    console.log('\n📋 Configuration Summary:');
    console.log('=========================');

    if (issues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES (must fix):');
        issues.forEach(issue => console.log(`   ${issue}`));
    }

    if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS (should address):');
        warnings.forEach(warning => console.log(`   ${warning}`));
    }

    if (issues.length === 0 && warnings.length === 0) {
        console.log('\n✅ All Stripe configurations are properly set!');
    }

    console.log('\n💡 Next Steps:');
    console.log('-------------');
    if (issues.length > 0) {
        console.log('   • Fix all critical issues before proceeding');
    }
    if (warnings.length > 0) {
        console.log('   • Address warnings for proper functionality');
    }
    if (!envConfig.STRIPE_WEBHOOK_SECRET || envConfig.STRIPE_WEBHOOK_SECRET.includes('placeholder')) {
        console.log('   • Configure webhook endpoint in Stripe dashboard (see STRIPE_SETUP.md)');
    }
    console.log('   • Test payment flow to ensure everything works');
    console.log('   • Review STRIPE_SETUP.md for complete setup instructions');

    return { issues, warnings };
}

// Run verification if called directly
if (require.main === module) {
    verifyStripeConfig();
}

module.exports = { verifyStripeConfig };