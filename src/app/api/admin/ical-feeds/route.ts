import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/adminAuth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        verifyAdmin(request);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const feeds = await prisma.iCalFeed.findMany({ orderBy: { createdAt: "desc" } });
        return NextResponse.json(feeds);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        verifyAdmin(request);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, url, source } = await request.json();

        if (!name || !url || !source) {
            return NextResponse.json({ error: 'Missing required fields: name, url, source' }, { status: 400 });
        }

        // Basic URL validation
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });
            }
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        const feed = await prisma.iCalFeed.create({
            data: { name, url, source },
        });
        return NextResponse.json(feed);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        verifyAdmin(request);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const reqUrl = new URL(request.url);
        const id = reqUrl.searchParams.get("id") ?? reqUrl.pathname.split('/').pop();

        if (!id) {
            return NextResponse.json({ error: "Feed ID required" }, { status: 400 });
        }

        await prisma.iCalFeed.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}
