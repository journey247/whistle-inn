import { prisma } from '@/lib/prisma';
import { cache } from 'react';

// Cache the content fetch for the duration of a request
export const getContent = cache(async (key: string, defaultValue = '') => {
    try {
        const block = await prisma.contentBlock.findUnique({
            where: { key }
        });
        return block?.value || defaultValue;
    } catch (error) {
        console.error(`Failed to fetch content for key: ${key}`, error);
        return defaultValue;
    }
});

// Fetch all content blocks, useful for passing to client components or admin UI
export const getAllContent = cache(async () => {
    try {
        const blocks = await prisma.contentBlock.findMany({
            orderBy: { key: 'asc' }
        });
        return blocks;
    } catch (error) {
        console.error('Failed to fetch all content blocks', error);
        return [];
    }
});
