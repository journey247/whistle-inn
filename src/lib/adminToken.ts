/**
 * Single source of truth for the admin session token.
 *
 * This exists because the codebase previously used two different localStorage
 * keys — login wrote `adminToken` while ~12 components read `admin_token`.
 * Those components silently sent `Bearer null` and every request 401'd, which
 * made whole panels look broken for no visible reason. Import from here rather
 * than touching localStorage directly so the key can never drift again.
 */

export const ADMIN_TOKEN_KEY = 'adminToken';

/** Read the stored admin token. Returns null on the server or when signed out. */
export function getAdminToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
        // localStorage can throw when site data is blocked
        return null;
    }
}

export function setAdminToken(token: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } catch {
        /* non-fatal */
    }
}

export function clearAdminToken(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
        /* non-fatal */
    }
}

/**
 * Authorization header for admin API calls.
 * Spread into a fetch init: `headers: { ...authHeaders() }`.
 */
export function authHeaders(): Record<string, string> {
    const token = getAdminToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Authorization + JSON content type, for admin POST/PUT/PATCH calls. */
export function jsonAuthHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json', ...authHeaders() };
}
