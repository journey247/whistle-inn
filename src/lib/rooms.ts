import { PROPERTY } from '@/config/property';

/**
 * The property's rooms, and helpers for reading them.
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

type RoomContent = {
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

/**
 * A room that can be sold on its own.
 *
 * The `default*Price` / `defaultMaxGuests` values are seed values only — once
 * the Room rows exist, the database is authoritative and the owner edits them
 * from Settings → Rooms. They stay here so a fresh database can be seeded
 * without hand-typing five rooms, and so the site can still quote a price if
 * the Room row is missing.
 */
export type BookableRoom = RoomContent & {
    bookable: true;
    defaultWeekdayPrice: number;
    defaultWeekendPrice: number;
    defaultMaxGuests: number;
};

/** A space shown on the site but not sold separately (the shared living room). */
export type SharedSpace = RoomContent & { bookable: false };

export type Room = BookableRoom | SharedSpace;

/**
 * The rooms, in display order. Each owner's list lives in their property
 * config (src/config/properties/), so no property's rooms are named here.
 */
export const ROOMS: Room[] = PROPERTY.rooms;

/** The rooms that can be booked individually, in display order. */
export const BOOKABLE_ROOMS: BookableRoom[] = ROOMS.filter(
    (r): r is BookableRoom => r.bookable
);

export function getBookableRoomBySlug(slug: string): BookableRoom | undefined {
    return BOOKABLE_ROOMS.find(r => r.slug === slug);
}

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
