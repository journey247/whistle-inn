# 🔐 Security Documentation - Whistle Inn

This document outlines the security measures implemented in the Whistle Inn vacation rental website and provides guidance for maintaining security.

## 🛡️ Security Features Implemented

### 1. **Authentication & Authorization**

#### JWT Security
- ✅ Strong JWT secrets (64+ characters)
- ✅ Token expiration (8 hours default)
- ✅ Proper token validation
- ✅ Protection against timing attacks
- ✅ No fallback to insecure defaults

#### Admin Authentication
- ✅ Secure password hashing (bcrypt, cost 12)
- ✅ Rate limiting (5 attempts per 5 minutes)
- ✅ Input validation and sanitization
- ✅ Server-side only setup keys
- ✅ Audit logging

### 2. **API Security**

#### Input Validation
- ✅ JSON payload validation
- ✅ Email format validation
- ✅ Input length limits
- ✅ Content-Type validation

#### Rate Limiting
- ✅ Authentication endpoints: 5 requests/5 minutes
- ✅ API endpoints: 100 requests/minute
- ✅ IP-based tracking

#### Error Handling
- ✅ Sanitized error messages
- ✅ Security event logging
- ✅ No information leakage

### 3. **Payment Security (Stripe)**

#### Webhook Security
- ✅ Signature verification
- ✅ Idempotent processing
- ✅ Proper error handling
- ✅ Environment validation

#### API Configuration
- ✅ No placeholder values in production
- ✅ Secure key management
- ✅ Transaction logging

### 4. **Infrastructure Security**

#### HTTP Security Headers
- ✅ Content Security Policy (CSP)
- ✅ Strict Transport Security (HSTS)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer Policy
- ✅ Permissions Policy

#### CORS Configuration
- ✅ Allowed origins restriction
- ✅ Credential handling
- ✅ Preflight request support

#### Middleware Protection
- ✅ Request validation
- ✅ Security headers injection
- ✅ Admin route protection

### 5. **Data Security**

#### Database Security
- ✅ SSL/TLS connections required
- ✅ Parameterized queries (Prisma)
- ✅ Field selection (no sensitive data exposure)
- ✅ Connection pooling

#### Environment Security
- ✅ No secrets in client-side code
- ✅ Secure environment variable management
- ✅ .gitignore protection

## 🔧 Security Setup Instructions

### 1. **Initial Setup**

```bash
# Generate secure environment configuration
npm run security:generate

# Run security audit
npm run security:audit

# Create first admin user
npm run create-admin
```

### 2. **Environment Configuration**

**CRITICAL**: Update these environment variables before deployment:

```bash
# Generate a strong JWT secret (64+ characters)
openssl rand -base64 64

# Set in .env.local:
NEXTAUTH_SECRET="your_generated_secret"
SETUP_KEY="your_admin_setup_key"
```

### 3. **Stripe Configuration**

1. Set up Stripe webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
2. Configure webhook events: `checkout.session.completed`
3. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`
4. Update Stripe keys (never use test keys in production)

### 4. **Production Deployment**

1. Set `NODE_ENV=production`
2. Configure `ALLOWED_ORIGINS` with your domain
3. Enable HTTPS (required for security headers)
4. Set up monitoring and logging
5. Regular security updates

## 🔍 Security Monitoring

### 1. **Log Monitoring**

Monitor these events:
- Failed authentication attempts
- Rate limit violations
- Webhook signature failures
- Admin user creation/login
- Database errors

### 2. **Regular Audits**

```bash
# Weekly security audit
npm run security:audit

# Check for vulnerable dependencies
npm audit

# Update dependencies regularly
npm update
```

### 3. **Security Headers Validation**

Use tools like:
- [Security Headers](https://securityheaders.com/)
- [Observatory by Mozilla](https://observatory.mozilla.org/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

## ⚠️ Security Warnings

### 🚨 **Never Commit These Files:**
- `.env.local`
- `.env.production`
- Any files containing API keys or secrets

### 🚨 **Production Checklist:**
- [ ] All environment variables configured
- [ ] No placeholder values in Stripe config
- [ ] Strong JWT secret generated
- [ ] HTTPS enabled
- [ ] Security headers active
- [ ] Rate limiting configured
- [ ] Admin setup key is server-side only
- [ ] Database connections use SSL
- [ ] Monitoring and logging enabled

## 🆘 Security Incident Response

### 1. **Suspected Breach**
1. Rotate all API keys immediately
2. Generate new JWT secret
3. Force logout all admin users
4. Check audit logs
5. Monitor for unusual activity

### 2. **Emergency Contacts**
- **Stripe**: Contact support for payment-related issues
- **Neon**: Database security concerns
- **Vercel**: Infrastructure and deployment issues

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Stripe Security](https://stripe.com/docs/security)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

**Last Updated**: February 8, 2026  
**Next Security Review**: Recommended monthly