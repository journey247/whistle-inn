import type { PropertyConfig } from '../property';

const name = 'Whistle Inn';
const propertyType = 'Victorian Farmhouse';

export const whistleInn: PropertyConfig = {
    id: 'whistle-inn',
    name,
    brandLine: 'Whistle Inn Private Getaway',
    siteUrl: 'https://thewhistleinn.com',
    title: 'Whistle Inn — Private Getaway in the Sierra',
    description:
        'A beautifully appointed Victorian farmhouse in Alta, California. Sleeps up to 14 — perfect for family gatherings, retreats, and getting away from it all.',
    roomsDescription:
        'Five bedrooms and a shared living space at Whistle Inn, a Victorian farmhouse in Alta, California. Sleeps up to 14.',
    ogImageAlt: 'The Whistle Inn — Victorian farmhouse exterior in Alta, California',
    propertyType,
    hostName: 'Nora',
    email: 'Nora@thewhistleinn.com',
    fromEmail: 'noreply@thewhistleinn.com',
    phone: '(530) 448-6242',
    phoneE164: '+15304486242',
    address: {
        street: '33800 Alta Bonny Nook Rd',
        locality: 'Alta',
        region: 'CA',
        postalCode: '95701',
        country: 'US',
    },
    locationLabel: 'Alta, California',
    checkinTime: '16:00',
    checkoutTime: '11:00',
    bedrooms: 5,
    maxGuests: 14,
    amenities: ['Pool', 'Full kitchen', 'Balcony'],

    // Fallbacks only: the live values are edited in Admin → Settings → Pricing.
    pricingDefaults: {
        weekdayNight: 650,
        weekendNight: 700,
        cleaningFee: 150,
        minimumNights: 3,
        // A single room is a far smaller commitment than the whole house; a
        // 3-night minimum would turn away the midweek one-nighters per-room
        // booking exists to capture.
        roomMinimumNights: 2,
    },

    // Mirrors Airbnb's "Moderate" policy with a 24-hour booking grace period.
    cancellation: {
        graceHours: 24,
        graceMinDaysBeforeCheckIn: 7,
        fullRefundDays: 5,
        partialRefundDays: 1,
        partialRefundPercent: 50,
    },

    // Photos live in /public. New owners' photos go in /public/properties/<id>/.
    heroImages: [
        { src: "/Exterior.avif", alt: `${name} ${propertyType} Exterior` },
        { src: "/1650.jpg", alt: `${name} Train View`, attribution: "Photo By: Annette Rogers Purther" },
        { src: "/pool.webp", alt: `${name} Pool Area` },
        { src: "/LivingRoom.webp", alt: `${name} Living Room` },
        { src: "/DiningArea.webp", alt: `${name} Dining Area` },
        { src: "/balcony.webp", alt: `${name} Balcony View` },
        { src: "/entry.jpg", alt: `${name} Grand Entrance` },
        { src: "/patio.webp", alt: `${name} Patio` },
        { src: "/fullkitchen.avif", alt: `${name} Kitchen` },
        { src: "/Bedroom1.webp", alt: `${name} Primary Bedroom` },
    ],

    galleryImages: [
        // Exterior & Property
        { src: "/Exterior.avif", alt: `${name} exterior — ${propertyType}`, category: "Exterior" },
        { src: "/entry.jpg", alt: "Property entry", category: "Exterior" },
        { src: "/patio.webp", alt: "Outdoor patio area", category: "Exterior" },
        { src: "/balcony.webp", alt: "Balcony with views", category: "Exterior" },
        { src: "/Poolrock.webp", alt: "Pool area with natural rock", category: "Pool" },
        { src: "/pool.webp", alt: "Pool — daytime", category: "Pool" },
        { src: "/pool@night.webp", alt: "Pool — evening ambiance", category: "Pool" },
        // Living Spaces
        { src: "/LivingRoom.webp", alt: "Spacious living room", category: "Living Areas" },
        { src: "/DiningArea.webp", alt: "Dining area — seats 14", category: "Living Areas" },
        { src: "/fullkitchen.avif", alt: "Full gourmet kitchen", category: "Living Areas" },
        // Bedrooms
        { src: "/Bedroom1.webp", alt: "Primary bedroom", category: "Bedrooms" },
        { src: "/Bedroom2.avif", alt: "Bedroom 2", category: "Bedrooms" },
        { src: "/Bedroom3.avif", alt: "Bedroom 3", category: "Bedrooms" },
        { src: "/Bedroom4.webp", alt: "Bedroom 4", category: "Bedrooms" },
        { src: "/Bedroom5.webp", alt: "Bedroom 5", category: "Bedrooms" },
        // Bathrooms
        { src: "/fullbath1.jpg", alt: "Full bathroom 1", category: "Bathrooms" },
        { src: "/fullbath2.webp", alt: "Full bathroom 2", category: "Bathrooms" },
        { src: "/fullbath3.webp", alt: "Full bathroom 3", category: "Bathrooms" },
        { src: "/fullbath4.webp", alt: "Full bathroom 4", category: "Bathrooms" },
        { src: "/halfbath.avif", alt: "Half bath", category: "Bathrooms" },
        // Property Details
        { src: "/1663.jpg", alt: "Property detail", category: "Details" },
        { src: "/1665.jpg", alt: "Property detail", category: "Details" },
        { src: "/1667.jpg", alt: "Property detail", category: "Details" },
        { src: "/1673.jpg", alt: "Property detail", category: "Details" },
        { src: "/1676.jpg", alt: "Property detail", category: "Details" },
        { src: "/1678.jpg", alt: "Property detail", category: "Details" },
        { src: "/1681.jpg", alt: "Property detail", category: "Details" },
        { src: "/1687.jpg", alt: "Property detail", category: "Details" },
        { src: "/1689.jpg", alt: "Property detail", category: "Details" },
        { src: "/1691.jpg", alt: "Property detail", category: "Details" },
        { src: "/1692.jpg", alt: "Property detail", category: "Details" },
    ],

    rooms: [
        {
            slug: 'conductors-suite',
            bookable: true,
            defaultWeekdayPrice: 195,
            defaultWeekendPrice: 225,
            defaultMaxGuests: 3,
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
            bookable: true,
            defaultWeekdayPrice: 165,
            defaultWeekendPrice: 195,
            defaultMaxGuests: 2,
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
            bookable: true,
            defaultWeekdayPrice: 185,
            defaultWeekendPrice: 215,
            defaultMaxGuests: 4,
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
            bookable: true,
            defaultWeekdayPrice: 165,
            defaultWeekendPrice: 195,
            defaultMaxGuests: 2,
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
            bookable: true,
            defaultWeekdayPrice: 165,
            defaultWeekendPrice: 195,
            defaultMaxGuests: 2,
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
            bookable: false,
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
    ],
};
