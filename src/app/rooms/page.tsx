import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Bed, Home } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ROOMS, resolveRoom } from '@/lib/rooms';
import { RoomBookingCta } from '@/components/RoomBookingCta';

export const revalidate = 60;

const TITLE = 'Rooms — Whistle Inn';
const DESCRIPTION =
    'Five bedrooms and a shared living space at Whistle Inn, a Victorian farmhouse in Alta, California. Sleeps up to 10.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: '/rooms' },
    openGraph: {
        type: 'website',
        siteName: 'Whistle Inn',
        title: TITLE,
        description: DESCRIPTION,
        url: '/rooms',
        images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Whistle Inn' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: TITLE,
        description: DESCRIPTION,
        images: ['/og-image.jpg'],
    },
};

async function getContent(): Promise<Record<string, string>> {
    try {
        const blocks = await prisma.contentBlock.findMany();
        return Object.fromEntries(blocks.map(b => [b.key, b.value]));
    } catch (error) {
        console.error('Failed to fetch room content:', error);
        return {};
    }
}

export default async function RoomsIndexPage() {
    const content = await getContent();
    const rooms = ROOMS.map(room => resolveRoom(room, content));

    return (
        <main className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-gold transition-colors"
                    >
                        <Home className="w-3.5 h-3.5" /> Back to Whistle Inn
                    </Link>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900">
                        Where you&rsquo;ll sleep
                    </h1>
                    <p className="mt-3 text-slate-600">
                        Five bedrooms and a shared living space, sleeping up to ten. The whole house
                        is yours &mdash; rooms aren&rsquo;t booked separately.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map(room => (
                        <Link
                            key={room.slug}
                            href={`/rooms/${room.slug}`}
                            className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                        >
                            <div className="relative h-56 overflow-hidden bg-slate-200">
                                <Image
                                    src={room.image}
                                    alt={room.title}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            </div>
                            <div className="p-5">
                                <h2 className="font-serif text-xl font-bold text-slate-900 group-hover:text-brand-gold transition-colors">
                                    {room.title}
                                </h2>
                                <p className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                    <Bed className="w-4 h-4" /> {room.beds}
                                </p>
                                <p className="mt-3 text-sm text-slate-600 line-clamp-3">
                                    {room.description}
                                </p>
                                <span className="inline-block mt-4 text-sm font-semibold text-brand-gold">
                                    Read more &rarr;
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-14 text-center">
                    <RoomBookingCta label="Check availability" />
                </div>
            </div>
        </main>
    );
}
