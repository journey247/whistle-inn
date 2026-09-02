// Diagnostic global-error entry to trace prerender module evaluation
// This is a minimal server component that logs when it's evaluated.
try {
    // eslint-disable-next-line no-console
    console.log('app/_global-error: module loaded (server?)', typeof window === 'undefined' ? 'server' : 'client');
} catch (e) { }

export default function GlobalErrorPage() {
    return null;
}
