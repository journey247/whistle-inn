/**
 * Room shapes for the code config (src/config/properties/).
 *
 * These are seed values only. The live room list — copy, photos, order and
 * which rooms are sold separately — is the property profile (getRooms() in
 * src/lib/property.ts); prices and capacity are the Room table. The ContentBlock
 * keys below are read once, to carry copy edited before the profile existed
 * into the owner's first save.
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
