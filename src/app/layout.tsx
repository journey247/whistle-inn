import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
    themeColor: '#DAA520',
};

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://thewhistleinn.com';

const SITE_TITLE = 'Whistle Inn — Private Getaway in the Sierra';
const SITE_DESCRIPTION =
    'A beautifully appointed Victorian farmhouse in Alta, California. Sleeps up to 14 — perfect for family gatherings, retreats, and getting away from it all.';

export const metadata: Metadata = {
    // metadataBase makes the relative OG/Twitter image URLs below resolve to
    // absolute ones. Without it, social crawlers get a relative path and show
    // no preview image at all.
    metadataBase: new URL(SITE_URL),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    alternates: {
        canonical: '/',
    },
    openGraph: {
        type: 'website',
        siteName: 'Whistle Inn',
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        url: '/',
        locale: 'en_US',
        images: [
            {
                url: '/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'The Whistle Inn — Victorian farmhouse exterior in Alta, California',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        images: ['/og-image.jpg'],
    },
    robots: {
        index: true,
        follow: true,
    },
    // Google Search Console ownership check. The HTML-tag method is used rather
    // than the DNS TXT record because the domain's DNS is not managed here, and
    // a meta tag survives redeploys without anyone touching a registrar.
    //
    // Set GOOGLE_SITE_VERIFICATION in Vercel to the token from the Search
    // Console "HTML tag" option — the content="..." value only, not the whole
    // tag. Unset (e.g. locally), `verification` is omitted entirely rather than
    // emitting an empty tag that Search Console would read as a failed check.
    ...(process.env.GOOGLE_SITE_VERIFICATION
        ? {
              verification: {
                  google: process.env.GOOGLE_SITE_VERIFICATION,
              },
          }
        : {}),
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Whistle Inn'
    }
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="scroll-smooth">
            <body className={`${inter.variable} ${playfair.variable} font-sans`}>
                {children}
                {/*
                 * Vercel Web Analytics. Cookieless and privacy-preserving, so it
                 * needs no consent banner — which is why it is here rather than
                 * Google Analytics. Records page views and referrers only; the
                 * booking funnel is already visible in the admin panel.
                 */}
                <Analytics />
            </body>
        </html>
    );
}
