import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireAdmin, AdminAuthError } from '@/lib/adminAuth';
import { audit } from '@/lib/audit';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/upload — store a photo and return its URL.
 *
 * In production the photo goes to Vercel Blob (BLOB_READ_WRITE_TOKEN): the
 * deployed filesystem is read-only, so writing to public/ there loses the file.
 * Locally, without a token, it is written to public/uploads as before.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
};

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin(request);

        const formData = await request.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }
        const ext = IMAGE_TYPES[file.type];
        if (!ext) {
            return NextResponse.json({ error: 'Upload a JPEG, PNG, WebP, AVIF or GIF image' }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: 'Photos must be 10 MB or smaller' }, { status: 400 });
        }

        // Never trust the client's filename beyond a short, safe stem.
        const stem = file.name.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || 'photo';
        const filename = `${Date.now()}-${stem}.${ext}`;

        let url: string;
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            const blob = await put(`uploads/${filename}`, file, {
                access: 'public',
                contentType: file.type,
                addRandomSuffix: true,
            });
            url = blob.url;
        } else if (process.env.VERCEL) {
            return NextResponse.json(
                { error: 'Photo uploads need Vercel Blob. Connect a Blob store to this project, then try again.' },
                { status: 503 }
            );
        } else {
            const uploadDir = join(process.cwd(), 'public', 'uploads');
            if (!existsSync(uploadDir)) {
                mkdirSync(uploadDir, { recursive: true });
            }
            await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));
            url = `/uploads/${filename}`;
        }

        await audit({ actor: admin, action: 'media.uploaded', target: url, request });

        return NextResponse.json({ url });
    } catch (error) {
        if (error instanceof AdminAuthError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
