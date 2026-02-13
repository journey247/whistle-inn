"use client";

import { ContentProvider } from "@/components/content/ContentProvider";
import { ToastProvider } from "@/components/ui/toast-context";
import HomeContent from "@/components/HomeContent";

interface PageClientProps {
    content: Record<string, string>;
}

export default function PageClient({ content }: PageClientProps) {
    return (
        <ToastProvider>
            <ContentProvider initialContent={content}>
                <HomeContent />
            </ContentProvider>
        </ToastProvider>
    );
}