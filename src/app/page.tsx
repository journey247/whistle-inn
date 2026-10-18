// src/app/page.tsx - Server Component
import { prisma } from "@/lib/prisma";
import PageClient from "@/components/PageClient";
import { PROPERTY, SITE_URL } from '@/config/property';

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
    name: PROPERTY.name,
    description: PROPERTY.description,
    url: SITE_URL,
    image: `${SITE_URL}/og-image.jpg`,
    telephone: PROPERTY.phoneE164,
    address: {
        '@type': 'PostalAddress',
        streetAddress: PROPERTY.address.street,
        addressLocality: PROPERTY.address.locality,
        addressRegion: PROPERTY.address.region,
        postalCode: PROPERTY.address.postalCode,
        addressCountry: PROPERTY.address.country,
    },
    checkinTime: PROPERTY.checkinTime,
    checkoutTime: PROPERTY.checkoutTime,
    // Add `petsAllowed` once confirmed.
    numberOfRooms: PROPERTY.bedrooms,
    amenityFeature: PROPERTY.amenities.map(name => (
        { '@type': 'LocationFeatureSpecification', name, value: true }
    )),
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
