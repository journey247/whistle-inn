// Temporary server-safe stub for toast context to unblock prerender/build.
// IMPORTANT: restore the full client implementation after diagnostics.

try {
    // eslint-disable-next-line no-console
    console.log('toast-context: server-safe stub loaded (server?)', typeof window === 'undefined' ? 'server' : 'client');
} catch (e) { }

export function ToastProvider({ children }: { children: React.ReactNode }) {
    // simple passthrough on the server/build
    return <>{children}</>;
}

export function useToast() {
    // return no-op api to avoid runtime errors during build/prerender
    return {
        addToast: (_message: string, _type?: string) => { /* noop */ },
        removeToast: (_id: string) => { /* noop */ },
    } as const;
}
