#!/usr/bin/env node

/**
 * Security Setup and Validation Script
 * Run this script to validate and configure security settings
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64url');
}

function validateEnvironment() {
    console.log('🔍 Validating environment configuration...\n');

    const required = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'SETUP_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'RESEND_API_KEY'
    ];

    const warnings = [];
    const errors = [];

    // Check if .env.local exists
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        errors.push('❌ .env.local file not found');
        return { warnings, errors };
    }

    // Read environment variables
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envVars[key] = value;
        }
    });

    // Validate required variables
    required.forEach(key => {
        const value = envVars[key] || process.env[key];
        if (!value) {
            errors.push(`❌ Missing required environment variable: ${key}`);
        } else if (value.includes('placeholder') || value.includes('REPLACE')) {
            errors.push(`❌ ${key} contains placeholder value`);
        } else if (key === 'NEXTAUTH_SECRET' && (value === 'dev-secret' || value.length < 32)) {
            errors.push(`❌ ${key} is insecure (too short or using dev-secret)`);
        } else {
            console.log(`✅ ${key}: Configured`);
        }
    });

    // Check for insecure configurations
    if (envVars.NEXT_PUBLIC_ADMIN_PASSWORD) {
        warnings.push('⚠️  NEXT_PUBLIC_ADMIN_PASSWORD found - this exposes secrets to client-side');
    }

    if (envVars.NODE_ENV !== 'production') {
        warnings.push('⚠️  NODE_ENV is not set to production');
    }

    return { warnings, errors };
}

function generateSecureEnv() {
    console.log('🔐 Generating secure environment template...\n');

    const template = `# SECURE ENVIRONMENT CONFIGURATION
# Generated on ${new Date().toISOString()}
# IMPORTANT: Update all placeholder values before deploying

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL="postgresql://username:password@hostname:5432/database?sslmode=require"

# =============================================================================
# AUTHENTICATION & SECURITY
# =============================================================================
# JWT Secret (CRITICAL: Generate with: openssl rand -base64 64)
NEXTAUTH_SECRET="${generateSecureSecret(64)}"

# Admin setup key (server-side only)
SETUP_KEY="${generateSecureSecret(32)}"

# =============================================================================
# PAYMENT PROCESSING
# =============================================================================
STRIPE_SECRET_KEY="sk_test_REPLACE_WITH_YOUR_STRIPE_SECRET_KEY"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY"
STRIPE_WEBHOOK_SECRET="whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET"

# =============================================================================
# EMAIL SERVICE
# =============================================================================
RESEND_API_KEY="re_REPLACE_WITH_YOUR_RESEND_API_KEY"
NEXT_PUBLIC_RESEND_FROM_EMAIL="noreply@yourdomain.com"

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
# Rate limiting (requests per minute)
RATE_LIMIT_AUTH=5
RATE_LIMIT_API=100

# Session configuration
SESSION_TIMEOUT_HOURS=8

# CORS allowed origins (comma-separated)
ALLOWED_ORIGINS="http://localhost:3000,https://yourdomain.com"

# =============================================================================
# DEPLOYMENT
# =============================================================================
NODE_ENV=production
`;

    fs.writeFileSync('.env.secure', template);
    console.log('✅ Secure environment template written to .env.secure');
    console.log('📝 Please review and update all placeholder values before using\n');
}

function securityAudit() {
    console.log('🛡️  SECURITY AUDIT REPORT');
    console.log('========================\n');

    const { warnings, errors } = validateEnvironment();

    if (errors.length > 0) {
        console.log('🚨 CRITICAL ISSUES:');
        errors.forEach(error => console.log(error));
        console.log('');
    }

    if (warnings.length > 0) {
        console.log('⚠️  WARNINGS:');
        warnings.forEach(warning => console.log(warning));
        console.log('');
    }

    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ All security checks passed!\n');
    }

    // Security checklist
    console.log('📋 SECURITY CHECKLIST:');
    console.log('----------------------');
    console.log('□ Environment variables configured securely');
    console.log('□ Strong JWT secret generated (64+ characters)');
    console.log('□ Database connection uses SSL');
    console.log('□ Stripe webhook secret configured');
    console.log('□ Rate limiting configured');
    console.log('□ Security headers enabled (CSP, HSTS, etc.)');
    console.log('□ Admin setup key is server-side only');
    console.log('□ Input validation implemented');
    console.log('□ Error messages sanitized');
    console.log('□ Logging configured for security events');
    console.log('□ HTTPS enforced in production');
    console.log('□ Environment variables not committed to git');
    console.log('');
}

function main() {
    const args = process.argv.slice(2);

    if (args.includes('--generate')) {
        generateSecureEnv();
    } else if (args.includes('--audit')) {
        securityAudit();
    } else {
        console.log('🔐 Whistle Inn Security Setup & Audit Tool\n');
        console.log('Usage:');
        console.log('  node scripts/security-setup.js --audit     # Run security audit');
        console.log('  node scripts/security-setup.js --generate  # Generate secure .env template');
        console.log('');
        securityAudit();
    }
}

if (require.main === module) {
    main();
}