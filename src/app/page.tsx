// src/app/page.tsx - Server Component
import { prisma } from "@/lib/prisma";
import PageClient from "@/components/PageClient";

export const revalidate = 60; // Revalidate every 60 seconds

async function getContent() {
    try {
        const blocks = await prisma.contentBlock.findMany();
        const contentMap: Record<string, string> = {};
        blocks.forEach(b => {
            contentMap[b.key] = b.value;
        });
        return contentMap;
    } catch (error) {
        console.error("Failed to fetch content:", error);
        return {};
    }
}

export default async function Page() {
    const content = await getContent();

    return <PageClient content={content} />;
}
