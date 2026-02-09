import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { IcalSyncInitializer } from '@/components/IcalSyncInitializer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
    title: 'Whistle Inn Private Getaway in the Sierra',
    description: 'A beautifully appointed Victorian Farmhouse in Alta, California. Perfect for family gatherings, retreats, and getting away from it all.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="scroll-smooth">
            <body className={`${inter.variable} ${playfair.variable} font-sans`}>
                <IcalSyncInitializer />
                {children}
            </body>
        </html>
    );
}
