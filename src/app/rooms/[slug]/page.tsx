import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bed, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ROOMS, getRoomBySlug, resolveRoom } from '@/lib/rooms';
import { RoomBookingCta } from '@/components/RoomBookingCta';

// Match the homepage: rebuild at most once a minute so edits made in the admin
// panel appear without turning every visit into a server render.
export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://thewhistleinn.com';

/** Prerender all six room pages at build time. */
export function generateStaticParams() {
    return ROOMS.map(room => ({ slug: room.slug }));
}

async function getContent(): Promise<Record<string, string>> {
    try {
        const blocks = await prisma.contentBlock.findMany();
        return Object.fromEntries(blocks.map(b => [b.key, b.value]));
    } catch (error) {
        console.error('Failed to fetch room content:', error);
        return {};
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug } = await params;
    const base = getRoomBySlug(slug);
    if (!base) return {};

    const room = resolveRoom(base, await getContent());

    // Trim long-form copy down to a usable meta description.
    const description = room.description.replace(/\s+/g, ' ').slice(0, 155).trim();
    const title = `${room.title} — Whistle Inn`;

    return {
        title,
        description,
        alternates: { canonical: `/rooms/${room.slug}` },
        openGraph: {
            type: 'website',
            siteName: 'Whistle Inn',
            title,
            description,
            url: `/rooms/${room.slug}`,
            images: [{ url: room.ogImage, width: 1200, height: 630, alt: `${room.title} at Whistle Inn` }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [room.ogImage],
        },
    };
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const base = getRoomBySlug(slug);
    if (!base) notFound();

    const content = await getContent();
    const room = resolveRoom(base, content);

    // Previous / next for walking through the rooms without going back to the index
    const position = ROOMS.findIndex(r => r.slug === room.slug);
    const prev = resolveRoom(ROOMS[(position - 1 + ROOMS.length) % ROOMS.length], content);
    const next = resolveRoom(ROOMS[(position + 1) % ROOMS.length], content);

    // Long descriptions are authored as plain text; treat blank lines as paragraphs.
    const paragraphs = room.description.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Room',
        name: room.title,
        description: room.description.replace(/\s+/g, ' ').trim(),
        url: `${SITE_URL}/rooms/${room.slug}`,
        image: `${SITE_URL}${room.image}`,
        bed: room.beds,
        containedInPlace: {
            '@type': 'LodgingBusiness',
            name: 'Whistle Inn',
            url: SITE_URL,
        },
    };

    return (
        <main className="min-h-screen bg-slate-50">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Hero */}
            <section className="relative h-[45vh] min-h-[320px] md:h-[60vh]">
                <Image
                    src={room.image}
                    alt={`${room.title} at Whistle Inn`}
                    fill
                    priority
                    sizes="100vw"
                    quality={85}
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/25" />

                <nav className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center gap-2 text-sm">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-white/90 hover:text-white bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 transition-colors"
                    >
                        <Home className="w-3.5 h-3.5" /> Home
                    </Link>
                    <Link
                        href="/rooms"
                        className="inline-flex items-center gap-1.5 text-white/90 hover:text-white bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 transition-colors"
                    >
                        All rooms
                    </Link>
                </nav>

                <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white drop-shadow-lg">
                            {room.title}
                        </h1>
                        <p className="mt-3 inline-flex items-center gap-2 text-white/90 bg-black/30 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium">
                            <Bed className="w-4 h-4" /> {room.beds}
                        </p>
                    </div>
                </div>
            </section>

            {/* Description */}
            <section className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
                <div className="space-y-5">
                    {paragraphs.map((paragraph, i) => (
                        <p key={i} className="text-slate-700 leading-relaxed text-lg">
                            {paragraph}
                        </p>
                    ))}
                </div>

                <div className="mt-10 pt-8 border-t border-slate-200 text-center">
                    <h2 className="font-serif text-2xl font-bold text-slate-900 mb-2">
                        Planning a stay?
                    </h2>
                    <p className="text-slate-600 mb-6">
                        Rooms are booked together as the whole house — check which dates are open.
                    </p>
                    <RoomBookingCta />
                </div>
            </section>

            {/* Prev / next */}
            <nav className="max-w-3xl mx-auto px-6 pb-16 grid grid-cols-2 gap-3">
                <Link
                    href={`/rooms/${prev.slug}`}
                    className="group flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                >
                    <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-brand-gold transition-colors" />
                    <span className="min-w-0">
                        <span className="block text-[11px] uppercase tracking-wide text-slate-400">Previous</span>
                        <span className="block text-sm font-semibold text-slate-800 truncate">{prev.title}</span>
                    </span>
                </Link>
                <Link
                    href={`/rooms/${next.slug}`}
                    className="group flex items-center justify-end gap-3 bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow text-right"
                >
                    <span className="min-w-0">
                        <span className="block text-[11px] uppercase tracking-wide text-slate-400">Next</span>
                        <span className="block text-sm font-semibold text-slate-800 truncate">{next.title}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-brand-gold transition-colors" />
                </Link>
            </nav>
        </main>
    );
}
