import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

function renderTemplate(template: string, vars: Record<string, string | number | undefined>) {
    let result = template;
    for (const key of Object.keys(vars || {})) {
        const re = new RegExp(`{{\s*${key}\s*}}`, 'g');
        result = result.replace(re, String(vars[key] ?? ''));
    }
    return result;
}

export async function POST(req: NextRequest) {
    const { to, subject, body, templateName, variables, bookingId } = await req.json();

    try {
        let html = body;
        let finalSubject = subject;

        if (templateName) {
            const template = await prisma.emailTemplate.findUnique({ where: { name: templateName } });
            if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
            html = renderTemplate(template.body, variables || {});
            finalSubject = renderTemplate(template.subject, variables || {});
        }

        const from = process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL || 'noreply@thewhistleinn.com';

        await resend.emails.send({
            from,
            to,
            subject: finalSubject,
            html,
        });

        // Log email
        await prisma.emailLog.create({ data: { to, subject: finalSubject, body: html, template: templateName, bookingId } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Send email error:', error);
        return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
    }
}