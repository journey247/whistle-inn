/**
 * Thin clients for the APIs the operator scripts use (provision-owner.ts,
 * fleet.ts), plus the settings they share.
 *
 * Credentials come from .env.provision.local (gitignored) or the shell — never
 * from the site's own .env, which points at the Whistle Inn's production
 * database.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import type { PlatformConfig } from '../../src/lib/provisioning';

if (existsSync('.env.provision.local')) {
    dotenv.config({ path: '.env.provision.local', override: true });
}

export function requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is not set. Add it to .env.provision.local (see docs/PROVISIONING.md).`);
    }
    return value;
}

/**
 * Settings shared by every owner. Every name carries a PROVISION_ prefix on
 * purpose: importing Prisma Client loads the site's .env into process.env,
 * and that file holds the Whistle Inn's own Stripe and Resend keys. Plain
 * names like STRIPE_SECRET_KEY would quietly copy them into a new owner's site.
 */
export function platformConfig(): PlatformConfig {
    const env = (name: string) => process.env[name]?.trim() || undefined;
    return {
        projectPrefix: env('PROVISION_PROJECT_PREFIX') ?? 'stay-',
        gitRepo: env('PROVISION_GIT_REPO') ?? 'journey247/whistle-inn',
        neonRegion: env('PROVISION_NEON_REGION') ?? 'aws-us-east-1',
        resendApiKey: env('PROVISION_RESEND_API_KEY'),
        defaultFromEmail: env('PROVISION_FROM_EMAIL'),
        stripeSecretKey: env('PROVISION_STRIPE_SECRET_KEY'),
        stripePublishableKey: env('PROVISION_STRIPE_PUBLISHABLE_KEY'),
    };
}

export class ApiError extends Error {
    constructor(public service: string, public status: number, message: string) {
        super(`${service} ${status}: ${message}`);
    }
}

async function call<T>(service: string, url: string, token: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    if (!res.ok) {
        throw new ApiError(service, res.status, body?.error?.message ?? body?.message ?? text.slice(0, 300));
    }
    return body as T;
}

/** Vercel REST API, scoped to VERCEL_TEAM_ID. */
export function vercel<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(`https://api.vercel.com${path}`);
    url.searchParams.set('teamId', requireEnv('VERCEL_TEAM_ID'));
    return call<T>('Vercel', url.toString(), requireEnv('VERCEL_TOKEN'), init);
}

/** Neon API v2. */
export function neon<T>(path: string, init: RequestInit = {}): Promise<T> {
    return call<T>('Neon', `https://console.neon.tech/api/v2${path}`, requireEnv('NEON_API_KEY'), init);
}

/**
 * Run a Prisma CLI command against one database. DATABASE_URL is set
 * explicitly so the command can never fall back to the site's own .env.
 */
export function prisma(args: string[], databaseUrl: string): Promise<{ code: number; output: string }> {
    return new Promise(resolve => {
        const child = spawn('npx', ['prisma', ...args], {
            env: { ...process.env, DATABASE_URL: databaseUrl },
            shell: process.platform === 'win32',
        });
        let output = '';
        child.stdout.on('data', d => { output += d; });
        child.stderr.on('data', d => { output += d; });
        child.on('close', code => resolve({ code: code ?? 1, output }));
    });
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export type VercelProject = { id: string; name: string };
export type VercelEnv = { id: string; key: string; type: string; value?: string; target?: string[] };

/** Every owner site: projects named with the prefix, plus FLEET_EXTRA_PROJECTS (e.g. the original site). */
export async function fleetProjects(prefix: string): Promise<VercelProject[]> {
    const { projects } = await vercel<{ projects: VercelProject[] }>(`/v10/projects?search=${encodeURIComponent(prefix)}&limit=100`);
    const extra = (process.env.FLEET_EXTRA_PROJECTS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const extras = await Promise.all(
        extra.map(name => vercel<VercelProject>(`/v9/projects/${encodeURIComponent(name)}`).catch(() => null))
    );
    const all = [...extras.filter((p): p is VercelProject => !!p), ...projects.filter(p => p.name.startsWith(prefix))];
    return [...new Map(all.map(p => [p.id, p])).values()];
}

/** One env var's value, decrypted. */
export async function envValue(projectId: string, key: string): Promise<string | null> {
    const { envs } = await vercel<{ envs: VercelEnv[] }>(`/v10/projects/${projectId}/env`);
    const match = envs.find(e => e.key === key && (e.target ?? []).includes('production'));
    if (!match) return null;
    const full = await vercel<VercelEnv>(`/v1/projects/${projectId}/env/${match.id}`);
    return full.value ?? null;
}
