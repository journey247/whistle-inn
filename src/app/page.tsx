import { getAllContent } from "@/lib/content";
import HomeClient from "@/components/HomeClient";

// Force dynamic rendering to ensure fresh content
export const dynamic = "force-dynamic";

export default async function Home() {
    // 1. Fetch all content blocks efficiently
    const contentBlocks = await getAllContent();

    // 2. Transform blocks to a simple key-value map
    const content = Array.isArray(contentBlocks)
        ? contentBlocks.reduce((acc: Record<string, string>, block: any) => {
            acc[block.key] = block.value;
            return acc;
        }, {})
        : {};

    // 3. Pass content to the client component
    return <HomeClient content={content} />;
}
