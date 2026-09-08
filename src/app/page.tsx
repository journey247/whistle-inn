// src/app/page.tsx - Server Component
import { prisma } from "@/lib/prisma";
import PageClient from "@/components/PageClient";

// ISR: rebuild the page at most once a minute so admin content edits appear
// without making every visit a server render. Previously this was overridden
// by a force-dynamic on the same file (and another in the root layout), which
// opted the whole site out of static generation and CDN caching.
export const revalidate = 60;

async function getContent() {
    try {
        const blocks = await prisma.contentBlock.findMany();
        const contentMap: Record<string, string> = {};
        blocks.forEach(b => {
            contentMap[b.key] = b.value;
        });
        return contentMap;
    } catch (error) {
        console.error("Failed to fetch content:", error);
        return {};
    }
}

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://thewhistleinn.com';

/**
 * Structured data so Google can surface the property as a lodging result.
 *
 * Google weights a complete address heavily for local/lodging results, and
 * cross-checks it against what is visible on the page — so keep this in step
 * with the contact details shown in the footer.
 *
 * `geo` is still omitted rather than guessed; add the real lat/long when known.
 */
const lodgingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: 'Whistle Inn',
    description:
        'A beautifully appointed Victorian farmhouse in Alta, California. Sleeps up to 10 — perfect for family gatherings, retreats, and getting away from it all.',
    url: SITE_URL,
    image: `${SITE_URL}/og-image.jpg`,
    telephone: '+1-530-448-6242',
    address: {
        '@type': 'PostalAddress',
        streetAddress: '33800 Alta Bonny Nook Rd',
        addressLocality: 'Alta',
        addressRegion: 'CA',
        postalCode: '95701',
        addressCountry: 'US',
    },
    checkinTime: '16:00',
    checkoutTime: '11:00',
    // 5 bedrooms, per the property photos in /public.
    // Add `petsAllowed` once confirmed.
    numberOfRooms: 5,
    amenityFeature: [
        { '@type': 'LocationFeatureSpecification', name: 'Pool', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Full kitchen', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Balcony', value: true },
    ],
};

export default async function Page() {
    const content = await getContent();

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingJsonLd) }}
            />
            <PageClient content={content} />
        </>
    );
}
