// src/hooks/useAdminAuth.ts
import { useState, useEffect } from 'react';

// Use a simple token check for client-side visibility. The real security is on the server.
export function useAdminAuth() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Check local storage for the admin token
        const token = localStorage.getItem('admin_token');
        if (token) {
            // In a production app, you might want to validate the token here
            // via a lightweight API call or by decoding its expiry.
            // For now, existence is enough for UI toggling.
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }
        setIsChecking(false);
    }, []);

    return { isAdmin, isChecking };
}
