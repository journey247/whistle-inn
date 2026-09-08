/**
 * Admin session helpers.
 *
 * The session is an httpOnly cookie set by /api/admin/auth/login. Page scripts
 * deliberately cannot read it, so there is no token to attach to requests — the
 * browser sends the cookie automatically on same-origin fetches.
 *
 * These helpers are kept (rather than deleted) so the ~14 admin components that
 * call them keep working unchanged, and so there remains a single place to
 * change if the transport changes again. `authHeaders()` now returns only the
 * headers a request still needs.
 *
 * History: the session used to live in localStorage under two different keys,
 * which silently broke half the dashboard, and was readable by any XSS on the
 * admin origin. Both problems are gone with the cookie.
 */

/** Legacy localStorage key, cleared on load so stale tokens don't linger. */
const LEGACY_TOKEN_KEYS = ['adminToken', 'admin_token'];

export function clearLegacyTokens(): void {
    if (typeof window === 'undefined') return;
    try {
        for (const key of LEGACY_TOKEN_KEYS) window.localStorage.removeItem(key);
    } catch {
        /* non-fatal */
    }
}

/**
 * Headers for an admin API call.
 *
 * Returns an empty object: the session cookie is attached by the browser. Kept
 * so call sites reading `...authHeaders()` need no changes.
 */
export function authHeaders(): Record<string, string> {
    return {};
}

/** Headers for an admin POST/PUT/PATCH. */
export function jsonAuthHeaders(): Record<string, string> {
    // The content type is not optional: middleware.ts rejects any
    // POST/PUT/PATCH without application/json with a 400.
    return { 'Content-Type': 'application/json' };
}

/**
 * Placeholder stand-in for the old bearer token.
 *
 * The session is an httpOnly cookie, so there is no readable token. This exists
 * only so the admin components that build an `Authorization` header keep
 * compiling; the header is ignored because requireAdmin reads the cookie first.
 *
 * Do NOT use this to decide whether the user is an admin — it is not a session
 * check and is truthy in every browser. Use `checkAdminSession()` for that.
 */
export function getAdminToken(): string | null {
    return typeof window === 'undefined' ? null : 'cookie-session';
}

/**
 * Ask the server whether the current browser has a valid admin session.
 *
 * This is the only reliable client-side admin check: the session cookie is
 * httpOnly and cannot be inspected by page scripts. Anything that gates admin
 * UI must await this rather than testing for a token, or it will show admin
 * affordances to every visitor.
 */
export async function checkAdminSession(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
        const res = await fetch('/api/admin/auth/me');
        return res.ok;
    } catch {
        return false;
    }
}

/** Ends the session by asking the server to clear the httpOnly cookie. */
export async function logout(): Promise<void> {
    clearLegacyTokens();
    try {
        await fetch('/api/admin/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
    } catch {
        /* best effort — the cookie expires on its own */
    }
}
