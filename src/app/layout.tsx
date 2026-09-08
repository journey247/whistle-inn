import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
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
    'A beautifully appointed Victorian farmhouse in Alta, California. Sleeps up to 10 — perfect for family gatherings, retreats, and getting away from it all.';

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
            </body>
        </html>
    );
}
