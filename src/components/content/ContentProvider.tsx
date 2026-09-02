import React from 'react';

// Temporary server-safe stub for ContentProvider to unblock build/prerender.
// IMPORTANT: restore the original client implementation after diagnostics.
try {
    // eslint-disable-next-line no-console
    console.log('content-provider: server-safe stub loaded (server?)', typeof window === 'undefined' ? 'server' : 'client');
} catch (e) { }

export function ContentProvider({ children, initialContent }: { children: React.ReactNode; initialContent?: Record<string, string> }) {
    // passthrough during server build
    return <>{children}</>;
}

export function useContent() {
    // Return a minimal, safe API for build/runtime. Restore real hook later.
    return {
        content: {} as Record<string, string>,
        isEditMode: false,
        isAdmin: false,
        toggleEditMode: () => { /* noop */ },
        updateContent: async (_k: string, _v: string) => { /* noop */ },
        saving: false,
    } as const;
}
