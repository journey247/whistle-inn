export default function GlobalError({ error }: { error?: Error }) {
    // Minimal server-safe global error page to avoid client-only hooks during prerender
    return (
        <html>
            <body>
                <main style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 48 }}>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
                    <p style={{ color: '#555', marginBottom: '1rem' }}>An unexpected error occurred while rendering the page.</p>
                    {error && (
                        <details style={{ whiteSpace: 'pre-wrap', background: '#f8f8f8', padding: 12, borderRadius: 6 }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Error details</summary>
                            <pre style={{ marginTop: 8 }}>{String(error?.message || error)}</pre>
                        </details>
                    )}
                </main>
            </body>
        </html>
    );
}
