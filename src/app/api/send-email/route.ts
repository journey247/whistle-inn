import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = 'force-dynamic';

// Admin-only endpoint — requires valid JWT. Do NOT expose publicly.
export async function POST(req: NextRequest) {
    try {
        await requireAdmin(req);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    try {
        await sendEmail(body);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Send email error:', error.message);
        return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
    }
}
