import { Resend } from "resend";
import { prisma } from '@/lib/prisma';

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 're_placeholder');
}

export async function sendEmail({
    to,
    subject,
    body,
    templateName,
    variables,
    bookingId,
    fallbackSubject,
    fallbackHtml,
}: {
    to: string;
    subject?: string;
    body?: string;
    templateName?: string;
    variables?: Record<string, string | number | undefined>;
    bookingId?: string;
    /** Used when templateName is provided but not found in DB */
    fallbackSubject?: string;
    /** Used when templateName is provided but not found in DB */
    fallbackHtml?: string;
}) {
    let html = body || '';
    let finalSubject = subject || '';

    // Helper to render simple {{ variable }} templates
    const renderTemplate = (text: string, vars: Record<string, string | number | undefined>) => {
        let result = text;
        for (const key of Object.keys(vars || {})) {
            const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            result = result.replace(re, String(vars[key] ?? ''));
        }
        return result;
    };

    if (templateName) {
        const template = await prisma.emailTemplate.findUnique({ where: { name: templateName } });
        if (template) {
            html = renderTemplate(template.body, variables || {});
            finalSubject = renderTemplate(template.subject, variables || {});
        } else if (fallbackSubject && fallbackHtml) {
            // DB template not seeded yet — use inline fallback
            console.warn(`[email] Template '${templateName}' not found — using fallback`);
            html = fallbackHtml;
            finalSubject = fallbackSubject;
        } else {
            throw new Error(`Email template '${templateName}' not found and no fallback provided`);
        }
    }

    if (!html || !finalSubject) {
        throw new Error("Email must have content (body or template) and subject");
    }

    // Send from verified domain; replies go to owner's personal inbox
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const replyTo = process.env.RESEND_REPLY_TO || undefined;

    const response = await getResend().emails.send({
        from,
        to,
        reply_to: replyTo,
        subject: finalSubject,
        html,
    });

    if (response.error) {
        throw new Error(response.error.message);
    }

    // Log the successful email
    await prisma.emailLog.create({
        data: {
            to,
            subject: finalSubject,
            body: html,
            template: templateName,
            bookingId
        }
    });

    return { success: true, id: response.data?.id };
}
