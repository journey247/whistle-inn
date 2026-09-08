// src/hooks/useAdminAuth.ts
import { useState, useEffect } from 'react';
import { checkAdminSession } from '@/lib/adminToken';

/**
 * Whether the current browser has a valid admin session.
 *
 * Asks the server, because the session cookie is httpOnly and unreadable from
 * page scripts. A previous version tested for a token in localStorage; once the
 * session moved to a cookie that check would have been true for every visitor,
 * showing admin UI to guests.
 */
export function useAdminAuth() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        let active = true;
        checkAdminSession()
            .then(ok => { if (active) setIsAdmin(ok); })
            .finally(() => { if (active) setIsChecking(false); });
        return () => { active = false; };
    }, []);

    return { isAdmin, isChecking };
}
