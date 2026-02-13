import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export async function POST(request: Request) {
    try {
        verifyAdmin(request);

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure unique filename to prevent overwrites
        const timestamp = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, ''); // Sanitize
        const filename = `${timestamp}-${originalName}`;

        // Save to public/uploads
        const uploadDir = join(process.cwd(), 'public', 'uploads');

        // Ensure directory exists
        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);

        return NextResponse.json({ url: `/uploads/${filename}` });
    } catch (error: any) {
        if (error.message === 'Authentication failed' || error.message === 'Invalid token' || error.message === 'Missing or invalid authorization header') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
