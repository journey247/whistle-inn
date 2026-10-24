/**
 * Operate on every owner's site at once.
 *
 *   npm run fleet -- list
 *   npm run fleet -- health
 *   npm run fleet -- migrate [--dry-run]    pending migrations on every database
 *   npm run fleet -- invite <id>            resend an owner's password-setup email
 *
 * Sites are the Vercel projects named with PROVISION_PROJECT_PREFIX, plus any
 * in FLEET_EXTRA_PROJECTS (the original site, e.g. "whistle-inn"). Each
 * site's database URL is read from its own Vercel environment, so there is no
 * second list of owners to keep in step.
 */

import { parseArgs } from 'util';
import { unpooledUrl } from '../src/lib/provisioning';
import { envValue, fleetProjects, platformConfig, prisma, vercel, type VercelProject } from './lib/platform';

const { positionals, values: flags } = parseArgs({
    allowPositionals: true,
    options: { 'dry-run': { type: 'boolean', default: false } },
});
const [command, target] = positionals;

async function siteUrlFor(p: VercelProject): Promise<string> {
    return (await envValue(p.id, 'NEXT_PUBLIC_BASE_URL')) ?? `https://${p.name}.vercel.app`;
}

async function databaseUrlFor(p: VercelProject): Promise<string | null> {
    const direct = await envValue(p.id, 'DATABASE_URL_UNPOOLED');
    if (direct) return direct;
    const pooled = await envValue(p.id, 'DATABASE_URL');
    return pooled ? unpooledUrl(pooled) : null;
}

async function health(projects: VercelProject[]) {
    let failures = 0;
    for (const p of projects) {
        const url = await siteUrlFor(p);
        const { deployments } = await vercel<{ deployments: { readyState?: string; state?: string; url: string }[] }>(
            `/v6/deployments?projectId=${p.id}&target=production&limit=1`,
        );
        const deploy = deployments[0]?.readyState ?? deployments[0]?.state ?? 'none';
        const started = Date.now();
        const site = await fetch(`${url}/api/settings/public`, { signal: AbortSignal.timeout(15_000) })
            .then(r => r.status).catch(() => 0);
        const ms = Date.now() - started;
        const dbUrl = await databaseUrlFor(p);
        const status = dbUrl ? await prisma(['migrate', 'status'], dbUrl) : null;
        const schema = !status ? 'no DATABASE_URL' : status.code === 0 ? 'up to date' : /not yet been applied/.test(status.output) ? 'MIGRATIONS PENDING' : 'status check failed';
        const ok = deploy === 'READY' && site === 200 && schema === 'up to date';
        if (!ok) failures++;
        console.log(`${ok ? '✓' : '✗'} ${p.name.padEnd(28)} deploy ${deploy.padEnd(8)} site ${String(site || 'down').padEnd(4)} ${String(ms).padStart(5)}ms  schema ${schema}  ${url}`);
    }
    if (failures) process.exitCode = 1;
}

/**
 * Apply pending migrations site by site, stopping at the first failure so one
 * bad migration does not roll across the fleet.
 */
async function migrate(projects: VercelProject[], dryRun: boolean) {
    for (const p of projects) {
        const dbUrl = await databaseUrlFor(p);
        if (!dbUrl) {
            console.log(`- ${p.name}: no DATABASE_URL, skipped`);
            continue;
        }
        const status = await prisma(['migrate', 'status'], dbUrl);
        if (status.code === 0) {
            console.log(`✓ ${p.name}: up to date`);
            continue;
        }
        const pending = status.output.match(/^\s*\d{8,}_[\w-]+$/gm)?.map(s => s.trim()) ?? [];
        if (dryRun) {
            console.log(`… ${p.name}: would apply ${pending.join(', ') || '(see prisma migrate status)'}`);
            continue;
        }
        console.log(`→ ${p.name}: applying ${pending.join(', ')}`);
        const result = await prisma(['migrate', 'deploy'], dbUrl);
        if (result.code !== 0) {
            console.error(`✗ ${p.name}: migrate deploy failed — stopping.\n${result.output}`);
            process.exit(1);
        }
        console.log(`✓ ${p.name}: done`);
    }
}

async function invite(projects: VercelProject[], id: string | undefined) {
    const prefix = platformConfig().projectPrefix;
    const project = projects.find(p => p.name === `${prefix}${id}` || p.name === id);
    if (!project) throw new Error(`No site "${id}". Run: npm run fleet -- list`);
    const email = await envValue(project.id, 'ADMIN_EMAIL');
    if (!email) throw new Error(`${project.name} has no ADMIN_EMAIL set`);
    const url = await siteUrlFor(project);
    const res = await fetch(`${url}/api/admin/auth/reset-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    });
    console.log(res.ok ? `Sent a password-setup email to ${email} (link valid for 1 hour).` : `Failed: ${res.status}`);
    if (!res.ok) process.exitCode = 1;
}

async function main() {
    const projects = await fleetProjects(platformConfig().projectPrefix);
    switch (command) {
        case 'list':
            for (const p of projects) console.log(`${p.name.padEnd(28)} ${await siteUrlFor(p)}`);
            break;
        case 'health':
            await health(projects);
            break;
        case 'migrate':
            await migrate(projects, flags['dry-run'] ?? false);
            break;
        case 'invite':
            await invite(projects, target);
            break;
        default:
            console.error('Usage: npm run fleet -- <list | health | migrate [--dry-run] | invite <id>>');
            process.exit(2);
    }
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
