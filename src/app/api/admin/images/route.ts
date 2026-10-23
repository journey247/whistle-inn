import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';
import { readdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        await requireAdmin(request);

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

        // Photos uploaded in production live in Vercel Blob, newest first.
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            try {
                const { blobs } = await list({ prefix: 'uploads/', limit: 500 });
                blobs
                    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
                    .forEach(b => cleanImages.unshift(b.url));
            } catch (err) {
                console.error('Blob list error:', err);
            }
        }

        return NextResponse.json(cleanImages);
    } catch (error) {
        if (error instanceof AdminAuthError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Image list error:', error);
        return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
    }
}
