import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const { email } = await req.json();
    try {
        await prisma.subscriber.create({ data: { email } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
    }
}