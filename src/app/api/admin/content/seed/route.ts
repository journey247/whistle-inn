import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// All default content blocks scraped from HomeContent.tsx fallback values
const SEED_BLOCKS = [
    // ── Hero Section ────────────────────────────────────────────────────────
    { key: 'hero_pill',     label: 'Hero Pill Badge',    type: 'text',     section: 'Hero Section', value: 'The Ultimate Freedom' },
    { key: 'hero_title',    label: 'Hero Title',         type: 'text',     section: 'Hero Section', value: 'Whistle Inn' },
    { key: 'hero_subtitle', label: 'Hero Subtitle',      type: 'text',     section: 'Hero Section', value: 'Live Your Sierra Dream' },
    { key: 'hero_desc',     label: 'Hero Description',   type: 'textarea', section: 'Hero Section', value: 'A thrilling sanctuary nestled in the Alta mountains. Where gold rushes meet powder days, and pure luxury meets the rhythmic pulse of passing trains. Vibrant, private, picture-perfect.' },
    { key: 'hero_button',   label: 'Hero Button Text',   type: 'text',     section: 'Hero Section', value: 'Book Your Stay' },

    // ── Intro ────────────────────────────────────────────────────────────────
    { key: 'intro_small',        label: 'Intro Tag',          type: 'text',     section: 'Intro', value: "A Train Lover's Paradise" },
    { key: 'intro_title',        label: 'Intro Headline',     type: 'text',     section: 'Intro', value: 'Embrace the Rhythm.' },
    { key: 'intro_title_accent', label: 'Headline Accent',    type: 'text',     section: 'Intro', value: 'Live Your Adventure.' },
    { key: 'intro_desc',         label: 'Intro Description',  type: 'textarea', section: 'Intro', value: "Immerse yourself in beauty all around you. Whether it's the thrill of winter ski resorts, the rush of spring fishing, or the excitement of summer gold prospecting, Whistle Inn is your perfect basecamp. With the rhythmic symphony of passing trains as your soundtrack. Without the crowds. Just pure, unadulterated adventure in nature's embrace." },

    // ── Highlights ──────────────────────────────────────────────────────────
    { key: 'highlights_title',   label: 'Highlights Title',   type: 'text',     section: 'Highlights', value: 'Highlights of the Estate' },

    // ── Adventures ──────────────────────────────────────────────────────────
    { key: 'adventures_small', label: 'Adventures Tag',        type: 'text',     section: 'Adventures', value: 'Adventure Awaits' },
    { key: 'adventures_title', label: 'Adventures Headline',   type: 'text',     section: 'Adventures', value: 'Your Playground in the Wild' },
    { key: 'adventures_desc',  label: 'Adventures Description',type: 'textarea', section: 'Adventures', value: 'Beyond the comfort of Whistle Inn, a world of natural beauty and excitement awaits. Explore the stunning Sierra Nevada foothills, where every season offers a new adventure.' },
    { key: 'adventure_img_0',  label: 'Adventure Image 1',     type: 'image_url',section: 'Adventures', value: '/adventure1.webp' },
    { key: 'adventure_img_1',  label: 'Adventure Image 2',     type: 'image_url',section: 'Adventures', value: '/adventure2.webp' },
    { key: 'adventure_img_2',  label: 'Adventure Image 3',     type: 'image_url',section: 'Adventures', value: '/adventure3.webp' },

    // ── Skiing ───────────────────────────────────────────────────────────────
    { key: 'winter_small',  label: 'Skiing Tag',          type: 'text',     section: 'Skiing', value: 'Winter Wonderland' },
    { key: 'winter_title',  label: 'Skiing Headline',     type: 'text',     section: 'Skiing', value: 'World-Class Ski Resorts Nearby' },
    { key: 'winter_desc_1', label: 'Skiing Description 1',type: 'textarea', section: 'Skiing', value: "Just a short drive from Whistle Inn, you'll find some of California's most renowned ski resorts. Embrace the thrill of fresh powder at world-class destinations like Dodge Ridge, Bear Valley, and the legendary resorts of Lake Tahoe, offering slopes for every skill level and breathtaking views of the snow-capped Sierra Nevada." },
    { key: 'winter_desc_2', label: 'Skiing Description 2',type: 'textarea', section: 'Skiing', value: "Whether you're a seasoned pro or trying skiing or snowboarding for the first time, the nearby resorts promise unforgettable winter adventures and cozy après-ski moments." },
    { key: 'resort_img',    label: 'Ski Resort Image',    type: 'image_url',section: 'Skiing', value: '/ski.webp' },

    // ── Fishing ──────────────────────────────────────────────────────────────
    { key: 'fishing_small',  label: 'Fishing Tag',          type: 'text',     section: 'Fishing', value: 'Pristine Waters' },
    { key: 'fishing_title',  label: 'Fishing Headline',     type: 'text',     section: 'Fishing', value: 'Fly Fishing on the American & Truckee Rivers' },
    { key: 'fishing_desc_1', label: 'Fishing Description 1',type: 'textarea', section: 'Fishing', value: 'The American and Truckee Rivers, celebrated for their pristine waters and abundant trout, are just moments away. Cast your line into crystal-clear streams amidst stunning natural beauty, where the rhythm of the river and the challenge of the catch offer an exhilarating adventure.' },
    { key: 'fishing_desc_2', label: 'Fishing Description 2',type: 'textarea', section: 'Fishing', value: "Experience the thrill of fly fishing in one of Northern California's most picturesque settings—perfect for both seasoned anglers and those looking to discover a new passion." },
    { key: 'fishing_img',    label: 'Fishing Image',        type: 'image_url',section: 'Fishing', value: '/fishing.jpg' },

    // ── Serenity (Trains) ────────────────────────────────────────────────────
    { key: 'serenity_small',       label: 'Train Tag',             type: 'text',     section: 'Serenity', value: 'Railroad Paradise' },
    { key: 'serenity_title',       label: 'Train Headline',        type: 'text',     section: 'Serenity', value: "A Train Enthusiast's Dream Destination" },
    { key: 'serenity_desc_1',      label: 'Train Description 1',   type: 'textarea', section: 'Serenity', value: "Whistle Inn offers more than just a place to stay—it's an invitation to experience the magic of railroading in a majestic setting, perfectly positioned along active railroad tracks. Here, the sounds are the powerful rumble of locomotives and the melodic whistle of passing trains." },
    { key: 'serenity_desc_2',      label: 'Train Description 2',   type: 'textarea', section: 'Serenity', value: 'Watch freight trains thunder by with their colorful cargo containers, passenger trains glide through with their rhythmic clatter, and feel the earth vibrate with each mighty passage. The nearby railroad corridor offers endless opportunities for train watching, photography, and experiencing the romance of rail travel.' },
    { key: 'serenity_accent',      label: 'Train Accent Line',     type: 'text',     section: 'Serenity', value: 'Discover the heartbeat of the Sierra Foothills railroad.' },
    { key: 'train_notice_title',   label: 'Train Notice Title',    type: 'text',     section: 'Serenity', value: 'About the Railroad' },
    { key: 'train_notice_desc',    label: 'Train Notice Text',     type: 'textarea', section: 'Serenity', value: 'Enjoy views of the historic railroad from the property. Trains pass through the area periodically adding to the authentic Sierra mountain experience. While most guests find it charming, train noise may be noticeable at times.' },

    // ── Rooms ────────────────────────────────────────────────────────────────
    { key: 'accomm_small',  label: 'Rooms Tag',          type: 'text',     section: 'Rooms', value: 'Accommodations' },
    { key: 'accomm_title',  label: 'Rooms Headline',     type: 'text',     section: 'Rooms', value: 'Sweet Dreams' },
    { key: 'accomm_desc',   label: 'Rooms Description',  type: 'textarea', section: 'Rooms', value: 'Five beautifully curated bedrooms designed for rest and relaxation after a day of mountain adventures.' },
    { key: 'room_img_0',    label: 'Room 1 Image',       type: 'image_url',section: 'Rooms', value: '/room1.webp' },
    { key: 'room_img_1',    label: 'Room 2 Image',       type: 'image_url',section: 'Rooms', value: '/room2.webp' },
    { key: 'room_img_2',    label: 'Room 3 Image',       type: 'image_url',section: 'Rooms', value: '/room3.webp' },
    { key: 'room_img_3',    label: 'Room 4 Image',       type: 'image_url',section: 'Rooms', value: '/room4.webp' },
    { key: 'room_img_4',    label: 'Room 5 Image',       type: 'image_url',section: 'Rooms', value: '/room5.webp' },

    // ── Room descriptions ────────────────────────────────────────────────────
    // Long-form copy for each room's own page at /rooms/<slug>. Kept in the
    // same 'Accommodations' section as room_N_title / room_N_beds so they group
    // together in the website editor. type 'textarea' gives a multi-line box.
    // Blank lines in the value render as separate paragraphs on the page.
    { key: 'room_1_desc', label: 'Conductors Suite — Description',   type: 'textarea', section: 'Accommodations', value: 'The largest of the bedrooms, with a king bed and a single — comfortable for a couple, a family, or a pair of friends.' },
    { key: 'room_2_desc', label: 'Tree House Room — Description',    type: 'textarea', section: 'Accommodations', value: 'A quiet queen room set among the pines, with the feel of a tree house and the light to match.' },
    { key: 'room_3_desc', label: 'Train Room — Description',         type: 'textarea', section: 'Accommodations', value: 'A queen and a full bed in a room that leans into the railroad history the inn is named for — a favourite with families.' },
    { key: 'room_4_desc', label: 'Starlit Sky Room — Description',   type: 'textarea', section: 'Accommodations', value: 'A restful queen room named for the Sierra night sky, far enough from town that the stars actually show.' },
    { key: 'room_5_desc', label: 'Breakmans Suite — Description',    type: 'textarea', section: 'Accommodations', value: 'A comfortable queen room with a warm, understated feel — an easy place to land at the end of a long day outdoors.' },
    { key: 'room_6_desc', label: 'Living Space — Description',       type: 'textarea', section: 'Accommodations', value: 'The shared living room, with a sofa bed for extra guests and room for the whole group to gather.' },

    // ── Concierge ────────────────────────────────────────────────────────────
    { key: 'concierge_title', label: 'Concierge Headline',   type: 'text',     section: 'Concierge', value: "Whatever You Need, We've Got You Covered" },
    { key: 'concierge_desc',  label: 'Concierge Description',type: 'textarea', section: 'Concierge', value: "We don't just host; we curate. From fresh local bakery deliveries to private event planning, our concierge team is here to make your wildest dreams a reality." },

    // ── Footer ───────────────────────────────────────────────────────────────
    { key: 'footer_title',  label: 'Footer CTA Headline', type: 'text',     section: 'Footer', value: 'Ready to create memories?' },
    { key: 'footer_button', label: 'Footer Button Text',  type: 'text',     section: 'Footer', value: 'Reserve Your Dates' },
    { key: 'footer_img',    label: 'Footer Background',   type: 'image_url',section: 'Footer', value: '/patio.webp' },
];

export async function POST(request: Request) {
    try {
        await requireAdmin(request);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let created = 0;
        let skipped = 0;

        for (const block of SEED_BLOCKS) {
            // Only insert if key doesn't already exist (don't overwrite custom edits)
            const existing = await prisma.contentBlock.findUnique({ where: { key: block.key } });
            if (!existing) {
                await prisma.contentBlock.create({ data: { ...block, category: 'General' } });
                created++;
            } else {
                // Update metadata (label, type, section) without touching value
                await prisma.contentBlock.update({
                    where: { key: block.key },
                    data: { label: block.label, type: block.type, section: block.section },
                });
                skipped++;
            }
        }

        return NextResponse.json({
            success: true,
            created,
            skipped,
            total: SEED_BLOCKS.length,
            message: `Seeded ${created} new blocks, updated metadata for ${skipped} existing blocks.`,
        });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
    }
}
