import type { MetadataRoute } from 'next';
import { getRooms } from '@/lib/property';
import { SITE_URL } from '@/config/property';

// Rooms come from the owner's profile, so a room added in Property setup must
// reach the sitemap without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const lastModified = new Date();
    const rooms = await getRooms();

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
        ...rooms.map(room => ({
            url: `${SITE_URL}/rooms/${room.slug}`,
            lastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        })),
    ];
}
