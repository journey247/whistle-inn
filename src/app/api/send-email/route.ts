import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    const body = await req.json();

    try {
        await sendEmail(body);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Send email error:', error);
        return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
    }
}