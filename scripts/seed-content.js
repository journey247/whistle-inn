const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const contentBlocks = [
        // --- Hero ---
        {
            key: "hero_title",
            label: "Hero Title",
            value: "Whistle Inn",
            type: "text",
            category: "Home",
            section: "Hero Section",
        },
        {
            key: "hero_subtitle",
            label: "Hero Subtitle",
            value: "Live Your Sierra Dream",
            type: "text",
            category: "Home",
            section: "Hero Section",
        },
        {
            key: "hero_description",
            label: "Hero Description",
            value: "A majestic sanctuary hidden in the Arnold pines. Where towering trees meet powder days, and pure luxury embraces rustic charm. Private, comfortable, perfect.",
            type: "textarea",
            category: "Home",
            section: "Hero Section",
        },

        // Hero Slider
        { key: "hero_slider_1", label: "Hero Slider 1", value: "/Exterior.avif", type: "image_url", category: "Home", section: "Hero Slider" },
        { key: "hero_slider_2", label: "Hero Slider 2", value: "/pool.webp", type: "image_url", category: "Home", section: "Hero Slider" },
        { key: "hero_slider_3", label: "Hero Slider 3", value: "/1663.jpg", type: "image_url", category: "Home", section: "Hero Slider" },
        { key: "hero_slider_4", label: "Hero Slider 4", value: "/1673.jpg", type: "image_url", category: "Home", section: "Hero Slider" },
        { key: "hero_slider_5", label: "Hero Slider 5", value: "/LivingRoom.webp", type: "image_url", category: "Home", section: "Hero Slider" },
        { key: "hero_slider_6", label: "Hero Slider 6", value: "/1681.jpg", type: "image_url", category: "Home", section: "Hero Slider" },
        { key: "hero_slider_7", label: "Hero Slider 7", value: "/1676.jpg", type: "image_url", category: "Home", section: "Hero Slider" },
        { key: "hero_slider_8", label: "Hero Slider 8", value: "/1678.jpg", type: "image_url", category: "Home", section: "Hero Slider" },
        { key: "hero_slider_9", label: "Hero Slider 9", value: "/DiningArea.webp", type: "image_url", category: "Home", section: "Hero Slider" },

        // --- About ---
        {
            key: "about_pill",
            label: "About Pill Text",
            value: "A Year-Round Paradise",
            type: "text",
            category: "Home",
            section: "About Section",
        },
        {
            key: "about_title",
            label: "About Title Main",
            value: "Escape to the Mountains.",
            type: "text",
            category: "Home",
            section: "About Section",
        },
        {
            key: "about_title_highlight",
            label: "About Title Highlight",
            value: "Awaken Your Soul.",
            type: "text",
            category: "Home",
            section: "About Section",
        },
        {
            key: "about_description",
            label: "About Description",
            value: "Immerse yourself in beauty all around you. Whether it's the thrill of winter ski resorts, the rush of spring fishing, or the joy of summer gold prospecting, Whistle Inn is your perfect basecamp. Without the crowds. Just pure, unadulterated beauty in nature's lap.",
            type: "textarea",
            category: "Home",
            section: "About Section",
        },

        // --- Highlights ---
        {
            key: "highlights_title",
            label: "Highlights Section Title",
            value: "Highlights of the Estate",
            type: "text",
            category: "Home",
            section: "Highlights",
        },
        { key: "highlight_1_image", label: "Highlight 1 Image (Pool)", value: "/pool.webp", type: "image_url", category: "Home", section: "Highlights" },
        { key: "highlight_1_title", label: "Highlight 1 Title", value: "Saltwater Pool", type: "text", category: "Home", section: "Highlights" },
        { key: "highlight_1_sub", label: "Highlight 1 Subtitle", value: "Heated & Private", type: "text", category: "Home", section: "Highlights" },

        { key: "highlight_2_image", label: "Highlight 2 Image (Kitchen)", value: "/fullkitchen.avif", type: "image_url", category: "Home", section: "Highlights" },
        { key: "highlight_2_title", label: "Highlight 2 Title", value: "Chef's Kitchen", type: "text", category: "Home", section: "Highlights" },
        { key: "highlight_2_sub", label: "Highlight 2 Subtitle", value: "Gather & Feast", type: "text", category: "Home", section: "Highlights" },

        { key: "highlight_3_image", label: "Highlight 3 Image (Entrance)", value: "/entry.jpg", type: "image_url", category: "Home", section: "Highlights" },
        { key: "highlight_3_title", label: "Highlight 3 Title", value: "Grand Entrance", type: "text", category: "Home", section: "Highlights" },
        { key: "highlight_3_sub", label: "Highlight 3 Subtitle", value: "Welcome Home", type: "text", category: "Home", section: "Highlights" },

        { key: "highlight_4_image", label: "Highlight 4 Image (Views)", value: "/balcony.webp", type: "image_url", category: "Home", section: "Highlights" },
        { key: "highlight_4_title", label: "Highlight 4 Title", value: "Scenic Views", type: "text", category: "Home", section: "Highlights" },
        { key: "highlight_4_sub", label: "Highlight 4 Subtitle", value: "Sierra Mountains", type: "text", category: "Home", section: "Highlights" },

        // --- Adventures ---
        { key: "adventures_pill", label: "Adventures Pill", value: "Adventure Awaits", type: "text", category: "Home", section: "Adventures" },
        { key: "adventures_title", label: "Adventures Title", value: "Your Playground in the Wild", type: "text", category: "Home", section: "Adventures" },
        { key: "adventures_intro", label: "Adventures Intro", value: "Beyond the comfort of Whistle Inn, a world of natural beauty and excitement awaits. Explore the stunning Sierra Nevada foothills, where every season offers a new adventure.", type: "textarea", category: "Home", section: "Adventures" },

        // Gallery
        { key: "adventure_gallery_1", label: "Gallery Image 1", value: "/1663.jpg", type: "image_url", category: "Home", section: "Adventures" },
        { key: "adventure_gallery_2", label: "Gallery Image 2", value: "/1673.jpg", type: "image_url", category: "Home", section: "Adventures" },
        { key: "adventure_gallery_3", label: "Gallery Image 3", value: "/1676.jpg", type: "image_url", category: "Home", section: "Adventures" },
        { key: "adventure_gallery_4", label: "Gallery Image 4", value: "/1678.jpg", type: "image_url", category: "Home", section: "Adventures" },
        { key: "adventure_gallery_5", label: "Gallery Image 5", value: "/1681.jpg", type: "image_url", category: "Home", section: "Adventures" },
        { key: "adventure_gallery_6", label: "Gallery Image 6", value: "/1687.jpg", type: "image_url", category: "Home", section: "Adventures" },

        // Ski
        { key: "adventure_ski_image", label: "Ski Section Image", value: "/1689.jpg", type: "image_url", category: "Home", section: "Adventures" },
        { key: "ski_pill", label: "Ski Section Pill", value: "Winter Wonderland", type: "text", category: "Home", section: "Adventures" },
        { key: "ski_title", label: "Ski Section Title", value: "World-Class Ski Resorts Nearby", type: "text", category: "Home", section: "Adventures" },
        { key: "ski_description", label: "Ski Section Description", value: "Just a short drive from Whistle Inn, you'll find some of California's most renowned ski resorts. Embrace the thrill of fresh powder at world-class destinations like Dodge Ridge, Bear Valley, and the legendary resorts of Lake Tahoe, offering slopes for every skill level and breathtaking views of the snow-capped Sierra Nevada.\n\nWhether you're a seasoned pro or trying skiing or snowboarding for the first time, the nearby resorts promise unforgettable winter adventures and cozy après-ski moments.", type: "textarea", category: "Home", section: "Adventures" },

        // Fish
        { key: "adventure_fish_image", label: "Fish Section Image", value: "/1691.jpg", type: "image_url", category: "Home", section: "Adventures" },
        { key: "fish_pill", label: "Fish Section Pill", value: "Pristine Waters", type: "text", category: "Home", section: "Adventures" },
        { key: "fish_title", label: "Fish Section Title", value: "Fly Fishing on the American & Truckee Rivers", type: "text", category: "Home", section: "Adventures" },
        { key: "fish_p1", label: "Fish Section Para 1", value: "The American and Truckee Rivers, celebrated for their pristine waters and abundant trout, are just moments away. Cast your line into crystal-clear streams amidst stunning natural beauty, where the rhythm of the river and the challenge of the catch offer a truly memorable escape.", type: "textarea", category: "Home", section: "Adventures" },
        { key: "fish_p2", label: "Fish Section Para 2", value: "Experience the joy of fly fishing in one of Northern California's most picturesque settings—perfect for both seasoned anglers and those looking to discover a new passion.", type: "textarea", category: "Home", section: "Adventures" },

        // Serenity
        { key: "serenity_pill", label: "Serenity Pill", value: "Relax and Unwind", type: "text", category: "Home", section: "Serenity" },
        { key: "serenity_title", label: "Serenity Title", value: "A Majestic Mountain Escape", type: "text", category: "Home", section: "Serenity" },
        { key: "serenity_p1", label: "Serenity Para 1", value: "Whistle Inn offers more than just a place to stay—it's an invitation to unwind in a majestic setting, far from the urban hustle. Here, you can relax under the pines and enjoy the mountain atmosphere.", type: "textarea", category: "Home", section: "Serenity" },
        { key: "serenity_p2", label: "Serenity Para 2", value: "Reconnect with loved ones and yourself under a blanket of stars, where the absence of city lights reveals the true splendor of the night sky. No city traffic. Just pure mountain vibes.", type: "textarea", category: "Home", section: "Serenity" },
        { key: "serenity_quote", label: "Serenity Quote", value: "Discover true relaxation in the heart of the Sierra Foothills.", type: "text", category: "Home", section: "Serenity" },

        // Footer
        { key: "footer_bg_image", label: "Footer Background", value: "/patio.webp", type: "image_url", category: "Home", section: "Footer" },
        { key: "footer_title", label: "Footer Title", value: "Ready to create memories?", type: "text", category: "Home", section: "Footer" },

        // Stats
        { key: "stats_guests", label: "Stats Guests Title", value: "14 Guests", type: "text", category: "Home", section: "Stats" },
        { key: "stats_guests_sub", label: "Stats Guests Sub", value: "Perfect for reunions", type: "text", category: "Home", section: "Stats" },
        { key: "stats_bedrooms", label: "Stats Bedrooms Title", value: "5 Bedrooms", type: "text", category: "Home", section: "Stats" },
        { key: "stats_bedrooms_sub", label: "Stats Bedrooms Sub", value: "Spacious comfort", type: "text", category: "Home", section: "Stats" },
        { key: "stats_beds", label: "Stats Beds Title", value: "8 Beds", type: "text", category: "Home", section: "Stats" },
        { key: "stats_beds_sub", label: "Stats Beds Sub", value: "Flexible sleeping", type: "text", category: "Home", section: "Stats" },
        { key: "stats_baths", label: "Stats Baths Title", value: "4.5 Baths", type: "text", category: "Home", section: "Stats" },
        { key: "stats_baths_sub", label: "Stats Baths Sub", value: "Luxury amenities", type: "text", category: "Home", section: "Stats" },

        // Concierge
        { key: "concierge_title", label: "Concierge Title", value: "Whatever You Need, We've Got You Covered", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_subtitle", label: "Concierge Subtitle", value: "We don't just host; we curate. From fresh local bakery deliveries to private event planning, our concierge team is here to make your wildest dreams a reality.", type: "textarea", category: "Home", section: "Concierge" },
        { key: "concierge_item_1_title", label: "Concierge Item 1 Title", value: "Personal Chef", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_1_desc", label: "Concierge Item 1 Desc", value: "Gourmet meals prepared in your kitchen", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_2_title", label: "Concierge Item 2 Title", value: "Fresh Bakery Delivery", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_2_desc", label: "Concierge Item 2 Desc", value: "Local goods delivered to your door", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_3_title", label: "Concierge Item 3 Title", value: "On-Demand Cleaning", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_3_desc", label: "Concierge Item 3 Desc", value: "Daily housekeeping services available", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_4_title", label: "Concierge Item 4 Title", value: "Event Planning", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_4_desc", label: "Concierge Item 4 Desc", value: "Retreats, reunions, and celebrations", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_5_title", label: "Concierge Item 5 Title", value: "Local Adventure Guides", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_5_desc", label: "Concierge Item 5 Desc", value: "Expert locals to lead the way", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_6_title", label: "Concierge Item 6 Title", value: "Shopping Assistant", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_6_desc", label: "Concierge Item 6 Desc", value: "Fully stocked fridge upon arrival", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_7_title", label: "Concierge Item 7 Title", value: "Digital Detox", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_7_desc", label: "Concierge Item 7 Desc", value: "Disconnect to reconnect", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_8_title", label: "Concierge Item 8 Title", value: "Anything You Want", type: "text", category: "Home", section: "Concierge" },
        { key: "concierge_item_8_desc", label: "Concierge Item 8 Desc", value: "Just ask, and we'll make it happen", type: "text", category: "Home", section: "Concierge" },


        // Rooms
        { key: "rooms_title", label: "Rooms Section Title", value: "Sweet Dreams", type: "text", category: "Home", section: "Rooms" },
        { key: "rooms_description", label: "Rooms Section Description", value: "Five beautifully curated bedrooms designed for rest and relaxation after a day of mountain adventures.", type: "textarea", category: "Home", section: "Rooms" },

        { key: "room_1_title", label: "Room 1 Title", value: "Primary Suite", type: "text", category: "Home", section: "Rooms" },
        { key: "room_1_beds", label: "Room 1 Beds", value: "1 King, 1 Single", type: "text", category: "Home", section: "Rooms" },
        { key: "room_1_img", label: "Room 1 Image", value: "/Bedroom1.webp", type: "image_url", category: "Home", section: "Rooms" },

        { key: "room_2_title", label: "Room 2 Title", value: "Guest Room 1", type: "text", category: "Home", section: "Rooms" },
        { key: "room_2_beds", label: "Room 2 Beds", value: "1 Queen Bed", type: "text", category: "Home", section: "Rooms" },
        { key: "room_2_img", label: "Room 2 Image", value: "/Bedroom2.avif", type: "image_url", category: "Home", section: "Rooms" },

        { key: "room_3_title", label: "Room 3 Title", value: "Family Room", type: "text", category: "Home", section: "Rooms" },
        { key: "room_3_beds", label: "Room 3 Beds", value: "1 Queen, 1 Double", type: "text", category: "Home", section: "Rooms" },
        { key: "room_3_img", label: "Room 3 Image", value: "/Bedroom3.avif", type: "image_url", category: "Home", section: "Rooms" },

        { key: "room_4_title", label: "Room 4 Title", value: "Guest Room 2", type: "text", category: "Home", section: "Rooms" },
        { key: "room_4_beds", label: "Room 4 Beds", value: "1 Queen Bed", type: "text", category: "Home", section: "Rooms" },
        { key: "room_4_img", label: "Room 4 Image", value: "/Bedroom4.webp", type: "image_url", category: "Home", section: "Rooms" },

        { key: "room_5_title", label: "Room 5 Title", value: "Guest Room 3", type: "text", category: "Home", section: "Rooms" },
        { key: "room_5_beds", label: "Room 5 Beds", value: "1 Queen Bed", type: "text", category: "Home", section: "Rooms" },
        { key: "room_5_img", label: "Room 5 Image", value: "/Bedroom5.webp", type: "image_url", category: "Home", section: "Rooms" },

        { key: "room_6_title", label: "Room 6 Title", value: "Living Space", type: "text", category: "Home", section: "Rooms" },
        { key: "room_6_beds", label: "Room 6 Beds", value: "Sofa Bed Available", type: "text", category: "Home", section: "Rooms" },
        { key: "room_6_img", label: "Room 6 Image", value: "/LivingRoom.webp", type: "image_url", category: "Home", section: "Rooms" },

        // Misc
        {
            key: "house_rules",
            label: "House Rules",
            value: "1. No smoking inside.\n2. Pets allowed on approval.\n3. Verify quiet hours.",
            type: "markdown",
            category: "Info",
            section: "Rules",
        }
    ];

    console.log('Start seeding content blocks...');
    for (const block of contentBlocks) {
        const existing = await prisma.contentBlock.findUnique({
            where: { key: block.key }
        });

        if (!existing) {
            await prisma.contentBlock.create({
                data: {
                    ...block,
                    updatedAt: new Date(),
                }
            });
            console.log(`Created content block: ${block.key}`);
        } else {
            // Update label/type/category/section so they appear correctly in admin even if key existed
            await prisma.contentBlock.update({
                where: { key: block.key },
                data: {
                    label: block.label,
                    type: block.type,
                    category: block.category,
                    section: block.section,
                    // Do NOT update value to preserve user changes
                }
            });
            console.log(`Updated metadata for content block: ${block.key}`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
