/**
 * Provision a new owner's site.
 *
 *   npm run provision -- --id pine-lodge --name "Pine Lodge" \
 *     --owner-name "Sam Rivera" --owner-email sam@example.com --phone "(530) 555-0142" \
 *     [--domain pinelodge.com] [--from-email bookings@pinelodge.com] [--dry-run] [--skip-invite]
 *
 * Steps, in order: Neon project → migrations → seed (profile + admin) →
 * Stripe webhook endpoints → Vercel project with env vars → domain → Blob
 * store → production deployment → health check → admin invite email.
 *
 * Nothing is reused: the script refuses to run if the Vercel project already
 * exists. If a step fails, it stops and lists what it had created, so the
 * operator can delete those and run it again.
 *
 * See docs/PROVISIONING.md for the credentials it needs.
 */

import { parseArgs } from 'util';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import {
    ownerInputSchema, projectName, siteUrl, newSecret, profileSeed, buildEnv, describeEnv,
    STRIPE_WEBHOOK_EVENTS, STRIPE_CONNECT_WEBHOOK_EVENTS, type GeneratedValues,
} from '../src/lib/provisioning';
import { ApiError, neon, platformConfig, prisma, requireEnv, sleep, vercel } from './lib/platform';

const { values: args } = parseArgs({
    options: {
        id: { type: 'string' },
        name: { type: 'string' },
        'owner-name': { type: 'string' },
        'owner-email': { type: 'string' },
        phone: { type: 'string' },
        domain: { type: 'string' },
        'from-email': { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        'skip-invite': { type: 'boolean', default: false },
    },
});

const created: string[] = [];
const log = (msg: string) => console.log(`• ${msg}`);

async function main() {
    const parsed = ownerInputSchema.safeParse({
        id: args.id,
        name: args.name,
        ownerName: args['owner-name'],
        ownerEmail: args['owner-email'],
        phone: args.phone,
        domain: args.domain,
        fromEmail: args['from-email'],
    });
    if (!parsed.success) {
        for (const issue of parsed.error.issues) console.error(`--${issue.path.join('.')}: ${issue.message}`);
        process.exit(2);
    }
    const input = parsed.data;
    const platform = platformConfig();
    const project = projectName(input, platform);
    const url = siteUrl(input, project);
    const vercelUrl = `https://${project}.vercel.app`;
    const [gitOrg, gitRepo] = platform.gitRepo.split('/');

    const secrets = { nextAuthSecret: newSecret(), totpEncryptionKey: newSecret(), cronSecret: newSecret() };

    // Without these the site cannot email anyone, including the owner's invite.
    const missing = [
        !platform.resendApiKey && 'PROVISION_RESEND_API_KEY',
        !(input.fromEmail ?? platform.defaultFromEmail) && '--from-email or PROVISION_FROM_EMAIL',
    ].filter(Boolean);

    if (args['dry-run']) {
        const placeholder: GeneratedValues = {
            ...secrets,
            databaseUrl: 'postgresql://… (pooled, from Neon)',
            databaseUrlUnpooled: 'postgresql://… (direct, from Neon)',
            stripeWebhookSecret: platform.stripeSecretKey ? 'whsec_…' : undefined,
            stripeConnectWebhookSecret: platform.stripeSecretKey ? 'whsec_…' : undefined,
        };
        console.log(`Dry run — nothing will be created.\n`);
        console.log(`Owner:            ${input.name} (${input.ownerName} <${input.ownerEmail}>)`);
        console.log(`Neon project:     ${project} in ${platform.neonRegion}`);
        console.log(`Vercel project:   ${project}, deploying ${platform.gitRepo}@main`);
        console.log(`Site URL:         ${url}${input.domain ? ` (until DNS is set: ${vercelUrl})` : ''}`);
        console.log(`Stripe webhooks:  ${platform.stripeSecretKey ? `${url}/api/stripe/webhook (platform + Connect)` : 'skipped — PROVISION_STRIPE_SECRET_KEY not set'}`);
        console.log(`Admin invite:     ${args['skip-invite'] ? 'skipped' : `password-setup email to ${input.ownerEmail}`}`);
        console.log(`\nEnvironment:\n  ${describeEnv(buildEnv(input, platform, url, placeholder)).join('\n  ')}`);
        if (missing.length) console.log(`\n⚠ Needed before a real run: ${missing.join(', ')}`);
        if (!platform.stripeSecretKey) console.log('⚠ PROVISION_STRIPE_SECRET_KEY not set: the site will take booking requests but no payments.');
        return;
    }

    if (missing.length) throw new Error(`Set ${missing.join(' and ')} first — the site could not send email.`);

    // Preflight: credentials present and the project name free.
    requireEnv('VERCEL_TOKEN');
    requireEnv('VERCEL_TEAM_ID');
    requireEnv('NEON_API_KEY');
    const existing = await vercel(`/v9/projects/${project}`).catch(e => (e instanceof ApiError && e.status === 404 ? null : Promise.reject(e)));
    if (existing) throw new Error(`Vercel project "${project}" already exists — pick another --id, or delete it first.`);

    // 1. Database
    log(`Creating Neon project ${project}`);
    const neonOrg = process.env.NEON_ORG_ID?.trim();
    const { project: neonProject, roles, databases } = await neon<{
        project: { id: string }; roles: { name: string }[]; databases: { name: string }[];
    }>('/projects', {
        method: 'POST',
        body: JSON.stringify({ project: { name: project, region_id: platform.neonRegion, pg_version: 17, ...(neonOrg ? { org_id: neonOrg } : {}) } }),
    });
    created.push(`Neon project ${neonProject.id}`);
    const role = roles.find(r => r.name.endsWith('_owner'))?.name ?? roles[0].name;
    const database = databases[0].name;
    const uri = (pooled: boolean) =>
        neon<{ uri: string }>(`/projects/${neonProject.id}/connection_uri?database_name=${database}&role_name=${role}&pooled=${pooled}`)
            .then(r => r.uri);
    const [databaseUrl, databaseUrlUnpooled] = await Promise.all([uri(true), uri(false)]);

    // 2. Schema
    log('Running migrations');
    const migrate = await prisma(['migrate', 'deploy'], databaseUrlUnpooled);
    if (migrate.code !== 0) throw new Error(`prisma migrate deploy failed:\n${migrate.output}`);

    // 3. Seed: the owner's profile over the neutral template, and their admin
    // login with a random password nobody knows — they set their own from the
    // invite email.
    log('Seeding the property profile and admin account');
    const db = new PrismaClient({ datasources: { db: { url: databaseUrlUnpooled } } });
    try {
        await db.propertyProfile.create({ data: { id: 'default', data: profileSeed(input) } });
        await db.adminUser.create({
            data: { email: input.ownerEmail, hashedPassword: await bcrypt.hash(newSecret(), 12), role: 'admin' },
        });
    } finally {
        await db.$disconnect();
    }

    // 4. Stripe webhooks on the platform account: one for its own events,
    // one for events on owners' connected accounts.
    let stripeWebhookSecret: string | undefined;
    let stripeConnectWebhookSecret: string | undefined;
    if (platform.stripeSecretKey) {
        log('Creating Stripe webhook endpoints');
        const stripe = new Stripe(platform.stripeSecretKey);
        const endpoint = `${url}/api/stripe/webhook`;
        const own = await stripe.webhookEndpoints.create({
            url: endpoint, enabled_events: [...STRIPE_WEBHOOK_EVENTS], description: `${input.name} (${project})`,
        });
        created.push(`Stripe webhook ${own.id}`);
        const connect = await stripe.webhookEndpoints.create({
            url: endpoint, enabled_events: [...STRIPE_CONNECT_WEBHOOK_EVENTS], connect: true, description: `${input.name} (${project}) — Connect`,
        });
        created.push(`Stripe webhook ${connect.id}`);
        stripeWebhookSecret = own.secret;
        stripeConnectWebhookSecret = connect.secret;
    }

    // 5. Vercel project, with its environment from the start so the first
    // build already has everything.
    log(`Creating Vercel project ${project}`);
    const env = buildEnv(input, platform, url, { ...secrets, databaseUrl, databaseUrlUnpooled, stripeWebhookSecret, stripeConnectWebhookSecret });
    const vercelProject = await vercel<{ id: string }>('/v11/projects', {
        method: 'POST',
        body: JSON.stringify({
            name: project,
            framework: 'nextjs',
            gitRepository: { type: 'github', repo: platform.gitRepo },
            environmentVariables: env,
        }),
    });
    created.push(`Vercel project ${vercelProject.id}`);

    // 6. Domain
    if (input.domain) {
        log(`Adding ${input.domain}`);
        const domain = await vercel<{ verified: boolean; verification?: { type: string; domain: string; value: string }[] }>(
            `/v10/projects/${vercelProject.id}/domains`,
            { method: 'POST', body: JSON.stringify({ name: input.domain }) },
        );
        if (!domain.verified) {
            console.log(`  ${input.domain} needs verifying. Add these DNS records:`);
            for (const v of domain.verification ?? []) console.log(`    ${v.type} ${v.domain} ${v.value}`);
        }
        console.log(`  Point ${input.domain} at Vercel: A record 76.76.21.21 (or CNAME cname.vercel-dns.com for a subdomain).`);
    }

    // 7. Photo storage, connected to the project (adds BLOB_READ_WRITE_TOKEN)
    log('Creating the Blob store for photo uploads');
    await vercel('/v1/storage/stores/blob', {
        method: 'POST',
        body: JSON.stringify({ name: `${project}-photos`.slice(0, 70), access: 'public', projectId: vercelProject.id }),
    }).then(() => created.push('Blob store')).catch(e => console.warn(`  Could not create the Blob store (${e.message}). Connect one in the Vercel dashboard; uploads fail until then.`));

    // 8. First production deployment
    log('Deploying');
    const deployment = await vercel<{ id: string }>('/v13/deployments', {
        method: 'POST',
        body: JSON.stringify({ name: project, project: vercelProject.id, target: 'production', gitSource: { type: 'github', org: gitOrg, repo: gitRepo, ref: 'main' } }),
    });
    let state = 'QUEUED';
    for (let i = 0; i < 90 && !['READY', 'ERROR', 'CANCELED'].includes(state); i++) {
        await sleep(10_000);
        state = (await vercel<{ readyState: string }>(`/v13/deployments/${deployment.id}`)).readyState;
    }
    if (state !== 'READY') throw new Error(`Deployment ${deployment.id} ended ${state}. Check its build log in Vercel.`);

    // 9. Health
    const health = await fetch(`${vercelUrl}/api/settings/public`);
    if (!health.ok) throw new Error(`Health check failed: ${vercelUrl}/api/settings/public returned ${health.status}`);
    log(`Live at ${vercelUrl}`);

    // 10. Invite: the existing password-reset email doubles as "set your password".
    if (!args['skip-invite']) {
        const invite = await fetch(`${vercelUrl}/api/admin/auth/reset-request`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: input.ownerEmail }),
        });
        log(invite.ok ? `Sent a password-setup email to ${input.ownerEmail}` : `Invite email failed (${invite.status}); run: npm run fleet -- invite ${input.id}`);
    }

    console.log(`\nDone. ${input.name} is provisioned.
  Site:   ${url}${input.domain ? `  (works at ${vercelUrl} until DNS is set)` : ''}
  Admin:  ${url}/admin — ${input.ownerEmail} sets a password from the email, then 2FA on first sign-in.
  Next:   the owner finishes Property setup; online checkout stays paused until the launch gate is met.`);
}

main().catch(err => {
    console.error(`\nProvisioning stopped: ${err.message}`);
    if (created.length) {
        console.error(`Created before stopping — delete these before running again:\n  ${created.join('\n  ')}`);
    }
    process.exit(1);
});
