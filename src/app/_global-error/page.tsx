export const dynamic = 'force-dynamic';

export default function GlobalError() {
    // Minimal global error page to avoid importing client-only modules during prerender
    return (
        <html>
            <body>
                <main style={{ padding: 40, fontFamily: 'system-ui, sans-serif' }}>
                    <h1>Something went wrong</h1>
                    <p>We're sorry — an unexpected error occurred. Try refreshing the page.</p>
                </main>
            </body>
        </html>
    );
}
