import type { MetadataRoute } from 'next';
import { ROOMS } from '@/lib/rooms';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://thewhistleinn.com';

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    return [
        {
            url: SITE_URL,
            lastModified,
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${SITE_URL}/gallery`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/rooms`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        // One entry per room so each long description can rank on its own
        ...ROOMS.map(room => ({
            url: `${SITE_URL}/rooms/${room.slug}`,
            lastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        })),
    ];
}
