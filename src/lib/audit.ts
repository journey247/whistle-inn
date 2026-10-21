import { prisma } from './prisma';
import { getClientIp } from './adminAuth';

export type AuditActor = { sub: string; email: string } | null | undefined;

export interface AuditEntry {
    actor?: AuditActor;
    /** Dotted name ("auth.login") or "METHOD /path" for automatic entries. */
    action: string;
    target?: string | null;
    /** Never put passwords, codes, tokens or card data in here. */
    details?: Record<string, unknown>;
    request?: Request;
}

/**
 * Record an admin action.
 *
 * Never throws: an audit-log outage must not block or fail the action being
 * recorded. Awaited by callers anyway so the write is not lost when a
 * serverless function freezes right after responding.
 */
export async function audit(entry: AuditEntry): Promise<void> {
    try {
        await prisma.adminAuditLog.create({
            data: {
                actorId: entry.actor?.sub ?? null,
                actorEmail: entry.actor?.email ?? null,
                action: entry.action.slice(0, 200),
                target: entry.target?.slice(0, 200) ?? null,
                details: entry.details ? (entry.details as object) : undefined,
                ip: entry.request ? getClientIp(entry.request) : null,
            },
        });
    } catch (err) {
        console.error('[audit] Failed to record', entry.action, err);
    }
}
