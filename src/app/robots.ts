import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://thewhistleinn.com';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                // The admin panel and API surface should never be indexed.
                // /success and /cancel contain individual guests' booking
                // details, so keep them out of search results too.
                disallow: ['/admin', '/api/', '/success', '/cancel/'],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
