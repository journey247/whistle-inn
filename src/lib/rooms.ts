/**
 * Canonical list of the property's rooms.
 *
 * Single source of truth for the homepage grid, the /rooms pages and the
 * sitemap, so a room cannot appear in one place and be missing from another.
 *
 * `slug` is deliberately hardcoded rather than derived from the title: titles
 * are editable from the admin panel, and a slug that shifted when the owner
 * renamed a room would break every existing link and lose its search ranking.
 *
 * `defaultX` values are fallbacks only. The live values come from ContentBlock
 * rows keyed by `titleKey` / `bedsKey` / `imageKey` / `descKey`, which is what
 * the admin panel edits.
 */

export type Room = {
    slug: string;
    /** Index used by the existing room_img_N content keys (0-based). */
    index: number;
    titleKey: string;
    bedsKey: string;
    imageKey: string;
    descKey: string;
    defaultTitle: string;
    defaultBeds: string;
    defaultImage: string;
    /** Short summary used for meta descriptions and card previews. */
    defaultSummary: string;
    /**
     * Social preview image. Deliberately a separate JPEG rather than reusing
     * `defaultImage`: several room photos are AVIF/WebP, and Facebook does not
     * reliably render those as og:image — the post would show no picture.
     */
    ogImage: string;
};

export const ROOMS: Room[] = [
    {
        slug: 'conductors-suite',
        index: 0,
        titleKey: 'room_1_title',
        bedsKey: 'room_1_beds',
        imageKey: 'room_img_0',
        descKey: 'room_1_desc',
        defaultTitle: 'Conductors Suite',
        defaultBeds: '1 King, 1 Single',
        defaultImage: '/Bedroom1.webp',
        defaultSummary:
            'The largest of the bedrooms, with a king bed and a single — comfortable for a couple, a family, or a pair of friends.',
        ogImage: '/og-rooms/conductors-suite.jpg',
    },
    {
        slug: 'tree-house-room',
        index: 1,
        titleKey: 'room_2_title',
        bedsKey: 'room_2_beds',
        imageKey: 'room_img_1',
        descKey: 'room_2_desc',
        defaultTitle: 'The Tree House Room',
        defaultBeds: '1 Queen Bed',
        defaultImage: '/Bedroom2.avif',
        defaultSummary:
            'A quiet queen room set among the pines, with the feel of a tree house and the light to match.',
        ogImage: '/og-rooms/tree-house-room.jpg',
    },
    {
        slug: 'train-room',
        index: 2,
        titleKey: 'room_3_title',
        bedsKey: 'room_3_beds',
        imageKey: 'room_img_2',
        descKey: 'room_3_desc',
        defaultTitle: 'The Train Room',
        defaultBeds: '1 Queen, 1 Full',
        defaultImage: '/Bedroom3.avif',
        defaultSummary:
            'A queen and a full bed in a room that leans into the railroad history the inn is named for — a favourite with families.',
        ogImage: '/og-rooms/train-room.jpg',
    },
    {
        slug: 'starlit-sky-room',
        index: 3,
        titleKey: 'room_4_title',
        bedsKey: 'room_4_beds',
        imageKey: 'room_img_3',
        descKey: 'room_4_desc',
        defaultTitle: 'Starlit Sky Room',
        defaultBeds: '1 Queen Bed',
        defaultImage: '/Bedroom4.webp',
        defaultSummary:
            'A restful queen room named for the Sierra night sky, far enough from town that the stars actually show.',
        ogImage: '/og-rooms/starlit-sky-room.jpg',
    },
    {
        slug: 'breakmans-suite',
        index: 4,
        titleKey: 'room_5_title',
        bedsKey: 'room_5_beds',
        imageKey: 'room_img_4',
        descKey: 'room_5_desc',
        defaultTitle: 'Breakmans Suite',
        defaultBeds: '1 Queen Bed',
        defaultImage: '/Bedroom5.webp',
        defaultSummary:
            'A comfortable queen room with a warm, understated feel — an easy place to land at the end of a long day outdoors.',
        ogImage: '/og-rooms/breakmans-suite.jpg',
    },
    {
        slug: 'living-space',
        index: 5,
        titleKey: 'room_6_title',
        bedsKey: 'room_6_beds',
        imageKey: 'room_img_5',
        descKey: 'room_6_desc',
        defaultTitle: 'Living Space',
        defaultBeds: 'Sofa Bed Available',
        defaultImage: '/LivingRoom.webp',
        defaultSummary:
            'The shared living room, with a sofa bed for extra guests and room for the whole group to gather.',
        ogImage: '/og-rooms/living-space.jpg',
    },
];

export function getRoomBySlug(slug: string): Room | undefined {
    return ROOMS.find(r => r.slug === slug);
}

/**
 * Resolve a room's live content from a ContentBlock map, falling back to the
 * defaults above so a page still renders correctly before anything is seeded.
 */
export function resolveRoom(room: Room, content: Record<string, string>) {
    const description = content[room.descKey]?.trim();
    return {
        ...room,
        title: content[room.titleKey]?.trim() || room.defaultTitle,
        beds: content[room.bedsKey]?.trim() || room.defaultBeds,
        image: content[room.imageKey]?.trim() || room.defaultImage,
        // Long-form copy is optional; the short summary stands in until written.
        description: description || room.defaultSummary,
        hasLongDescription: Boolean(description),
    };
}
