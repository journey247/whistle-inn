import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { readdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        verifyAdmin(request);

        const images: string[] = [];

        // Function to scan a directory for images
        const scanDir = async (dirName: string, prefix: string) => {
            const dirPath = join(process.cwd(), 'public', dirName);
            if (!existsSync(dirPath)) return;

            const files = await readdir(dirPath);
            files.forEach(file => {
                const ext = extname(file).toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg'].includes(ext)) {
                    images.push(`${prefix}/${file}`);
                }
            });
        };

        // Scan root public folder
        await scanDir('', ''); // Empty string for root public

        // Scan uploads folder
        await scanDir('uploads', '/uploads');

        // Clean up paths (remove double slashes if any)
        const cleanImages = images.map(img => img.startsWith('/') ? img : `/${img}`);

        return NextResponse.json(cleanImages);
    } catch (error: any) {
        if (error.message === 'Authentication failed' || error.message === 'Invalid token' || error.message === 'Missing or invalid authorization header') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Image list error:', error);
        return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
    }
}
