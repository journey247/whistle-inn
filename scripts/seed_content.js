const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const blocks = [
  // Hero Section
  { key: 'hero_pill', value: 'Adventure & Alpine Access', label: 'Hero Pill Text', section: 'Hero Section' },
  { key: 'hero_title', value: 'Whistle Inn', label: 'Main Title', section: 'Hero Section' },
  { key: 'hero_subtitle', value: 'Your Sierra Adventure Basecamp', label: 'Subtitle', section: 'Hero Section' },
  { key: 'hero_desc', value: 'Nestled in the heart of the Sierra Nevada foothills along historic railroad tracks. Where powder days meet pristine rivers, and mountain adventure meets rustic charm. Fresh mountain air, starlit skies, and endless outdoor pursuits await.', label: 'Description', type: 'textarea', section: 'Hero Section' },
  { key: 'hero_button', value: 'Book Your Adventure', label: 'CTA Button', section: 'Hero Section' },
  { key: 'hero_image', value: '/Exterior.avif', label: 'Hero Background Image', type: 'image', section: 'Hero Section' },

  // Stats
  { key: 'stat_1_label', value: '14 Guests', label: 'Stat 1 Label', section: 'Stats' },
  { key: 'stat_1_sub', value: 'Perfect for reunions', label: 'Stat 1 Subtext', section: 'Stats' },
  { key: 'stat_2_label', value: '5 Bedrooms', label: 'Stat 2 Label', section: 'Stats' },
  { key: 'stat_2_sub', value: 'Spacious comfort', label: 'Stat 2 Subtext', section: 'Stats' },
  { key: 'stat_3_label', value: '8 Beds', label: 'Stat 3 Label', section: 'Stats' },
  { key: 'stat_3_sub', value: 'Flexible sleeping', label: 'Stat 3 Subtext', section: 'Stats' },
  { key: 'stat_4_label', value: '4.5 Baths', label: 'Stat 4 Label', section: 'Stats' },
  { key: 'stat_4_sub', value: 'Luxury amenities', label: 'Stat 4 Subtext', section: 'Stats' },

  // Intro
  { key: 'intro_small', value: 'Where Rails Meet Trails', label: 'Intro Small Text', section: 'Intro' },
  { key: 'intro_title', value: 'Adventure. Nature.', label: 'Intro Title Main', section: 'Intro' },
  { key: 'intro_title_accent', value: 'Mountain Living.', label: 'Intro Title Accent', section: 'Intro' },
  { key: 'intro_desc', value: "Experience the magic of Sierra Nevada living alongside historic railroad tracks. Wake to the nostalgic sound of trains rolling through mountain passes, then set out for world-class skiing, pristine river fishing, and breathtaking hiking trails. Breathe the crisp mountain air, explore crystal-clear lakes, and immerse yourself in authentic mountain heritage where outdoor adventure and railroad history converge.", label: 'Intro Description', type: 'textarea', section: 'Intro' },

  // Highlights
  { key: 'highlights_title', value: 'Highlights of the Estate', label: 'Highlights Title', section: 'Highlights' },
  { key: 'highlight_img_0', value: '/pool.webp', label: 'Highlight Image 1 - Pool', type: 'image', section: 'Highlights' },
  { key: 'highlight_img_1', value: '/fullkitchen.avif', label: 'Highlight Image 2 - Kitchen', type: 'image', section: 'Highlights' },
  { key: 'highlight_img_2', value: '/DiningArea.webp', label: 'Highlight Image 3 - Dining', type: 'image', section: 'Highlights' },
  { key: 'highlight_img_3', value: '/balcony.webp', label: 'Highlight Image 4 - Balcony', type: 'image', section: 'Highlights' },

  // Adventures
  { key: 'adventures_small', value: 'Endless Outdoor Pursuits', label: 'Adventures Small Text', section: 'Adventures' },
  { key: 'adventures_title', value: 'Your Gateway to Sierra Adventures', label: 'Adventures Title', section: 'Adventures' },
  { key: 'adventures_desc', value: 'From Whistle Inn, the entire Sierra Nevada becomes your playground. Hike through pine forests and alpine meadows, fish world-renowned rivers and pristine mountain lakes, carve fresh powder on epic slopes, or simply watch historic trains wind through the mountains. Every season brings new adventures in this outdoor paradise.', label: 'Adventures Description', type: 'textarea', section: 'Adventures' },

  // Adventure Gallery Images
  { key: 'adventure_img_0', value: '/1665.jpg', label: 'Adventure Image 1', type: 'image', section: 'Adventures' },
  { key: 'adventure_img_1', value: '/1667.jpg', label: 'Adventure Image 2', type: 'image', section: 'Adventures' },
  { key: 'adventure_img_2', value: '/1673.jpg', label: 'Adventure Image 3', type: 'image', section: 'Adventures' },
  { key: 'adventure_img_3', value: '/1676.jpg', label: 'Adventure Image 4', type: 'image', section: 'Adventures' },
  { key: 'adventure_img_4', value: '/1681.jpg', label: 'Adventure Image 5', type: 'image', section: 'Adventures' },
  { key: 'adventure_img_5', value: '/1687.jpg', label: 'Adventure Image 6', type: 'image', section: 'Adventures' },

  // Winter
  { key: 'winter_small', value: 'Powder Paradise', label: 'Winter Small Text', section: 'Winter' },
  { key: 'winter_title', value: 'Epic Skiing & Snowboarding', label: 'Winter Title', section: 'Winter' },
  { key: 'winter_desc_1', value: "Access world-class skiing and snowboarding just minutes away. Dodge Ridge, Bear Valley, and the legendary Lake Tahoe resorts offer fresh powder, groomed runs, and terrain parks for all abilities. The crisp mountain air and stunning Sierra vistas create the perfect backdrop for unforgettable days on the slopes.", label: 'Winter Desc 1', type: 'textarea', section: 'Winter' },
  { key: 'winter_desc_2', value: "After a full day of shredding, return to Whistle Inn for cozy evenings by the fire. Listen to distant train whistles echo through snowy valleys while you warm up with hot cocoa and share stories of your mountain conquests.", label: 'Winter Desc 2', type: 'textarea', section: 'Winter' },
  { key: 'resort_img', value: '/fhjgfkyj.jpg', label: 'Ski Resort Image', type: 'image', section: 'Winter' },

  // Fishing
  { key: 'fishing_small', value: 'Rivers & Lakes', label: 'Fishing Small Text', section: 'Fishing' },
  { key: 'fishing_title', value: 'World-Class Fishing & Hiking', label: 'Fishing Title', section: 'Fishing' },
  { key: 'fishing_desc_1', value: 'The American and Truckee Rivers flow with crystal-clear waters teeming with trout, while nearby alpine lakes offer serene fishing spots surrounded by towering pines. Cast your line in the morning mist, then explore miles of hiking trails through wildflower meadows and along rushing streams. The fresh mountain air invigorates every adventure.', label: 'Fishing Desc 1', type: 'textarea', section: 'Fishing' },
  { key: 'fishing_desc_2', value: "From gentle riverside walks to challenging summit hikes, the trails around Whistle Inn showcase the Sierra's natural splendor. Spot wildlife, discover hidden waterfalls, and breathe deeply in one of California's most pristine mountain environments.", label: 'Fishing Desc 2', type: 'textarea', section: 'Fishing' },
  { key: 'fishing_img', value: '/fishing.jpg', label: 'Fishing Image', type: 'image', section: 'Fishing' },

  // Train Notice (Transparent Disclosure)
  { key: 'train_notice_title', value: 'About the Railroad', label: 'Train Notice Title', section: 'Train Notice' },
  { key: 'train_notice_desc', value: 'Enjoy views of the historic railroad from the property. Trains pass through the area periodically adding to the authentic Sierra mountain experience. While most guests find it charming, train noise may be noticeable at times.', label: 'Train Notice Description', type: 'textarea', section: 'Train Notice' },

  // Serenity
  { key: 'serenity_small', value: 'Railroad Heritage Meets Mountain Magic', label: 'Serenity Small Text', section: 'Serenity' },
  { key: 'serenity_title', value: 'A Unique Mountain Experience', label: 'Serenity Title', section: 'Serenity' },
  { key: 'serenity_desc_1', value: "Whistle Inn celebrates authentic Sierra living. Experience the romance of historic railroad tracks as freight trains wind through mountain passes—a nostalgic soundtrack that train enthusiasts adore. The rhythmic rumble adds character and connection to California's rich railroad heritage.", label: 'Serenity Desc 1', type: 'textarea', section: 'Serenity' },
  { key: 'serenity_desc_2', value: 'By day, explore endless trails and pristine rivers. By night, gather under brilliantly clear mountain skies where stars blaze without light pollution. The crisp, fresh mountain air and stunning natural beauty create an unforgettable alpine experience. For train lovers, outdoor adventurers, and nature enthusiasts alike—this is mountain living at its finest.', label: 'Serenity Desc 2', type: 'textarea', section: 'Serenity' },
  { key: 'serenity_accent', value: 'Where adventure, nature, and railroad history converge.', label: 'Serenity Accent', section: 'Serenity' },

  // Accommodations (Rooms)
  { key: 'accomm_small', value: 'Comfortable Lodging', label: 'Accommodations Small Text', section: 'Accommodations' },
  { key: 'accomm_title', value: 'Rest & Recharge', label: 'Accommodations Title', section: 'Accommodations' },
  { key: 'accomm_desc', value: 'Five comfortable bedrooms provide the perfect retreat after days filled with skiing, hiking, and fishing. Sleep soundly and wake refreshed for your next mountain adventure.', label: 'Accommodations Description', type: 'textarea', section: 'Accommodations' },

  // Rooms - Specific
  { key: 'room_1_title', value: "Primary Suite", label: "Primary Suite Title", section: 'Accommodations' },
  { key: 'room_1_beds', value: "1 King, 1 Single", label: "Primary Suite Beds", section: 'Accommodations' },
  { key: 'room_img_0', value: "/Bedroom1.webp", label: "Primary Suite Image", type: 'image', section: 'Accommodations' },

  { key: 'room_2_title', value: "Guest Room 1", label: "Guest Room 1 Title", section: 'Accommodations' },
  { key: 'room_2_beds', value: "1 Queen Bed", label: "Guest Room 1 Beds", section: 'Accommodations' },
  { key: 'room_img_1', value: "/Bedroom2.avif", label: "Guest Room 1 Image", type: 'image', section: 'Accommodations' },

  { key: 'room_3_title', value: "Family Room", label: "Family Room Title", section: 'Accommodations' },
  { key: 'room_3_beds', value: "1 Queen, 1 Double", label: "Family Room Beds", section: 'Accommodations' },
  { key: 'room_img_2', value: "/Bedroom3.avif", label: "Family Room Image", type: 'image', section: 'Accommodations' },

  { key: 'room_4_title', value: "Guest Room 2", label: "Guest Room 2 Title", section: 'Accommodations' },
  { key: 'room_4_beds', value: "1 Queen Bed", label: "Guest Room 2 Beds", section: 'Accommodations' },
  { key: 'room_img_3', value: "/Bedroom4.webp", label: "Guest Room 2 Image", type: 'image', section: 'Accommodations' },

  { key: 'room_5_title', value: "Guest Room 3", label: "Guest Room 3 Title", section: 'Accommodations' },
  { key: 'room_5_beds', value: "1 Queen Bed", label: "Guest Room 3 Beds", section: 'Accommodations' },
  { key: 'room_img_4', value: "/Bedroom5.webp", label: "Guest Room 3 Image", type: 'image', section: 'Accommodations' },

  { key: 'room_6_title', value: "Living Space", label: "Living Space Title", section: 'Accommodations' },
  { key: 'room_6_beds', value: "Sofa Bed Available", label: "Living Space Beds", section: 'Accommodations' },
  // room_img_5 logic in HomeContent uses array index 5
  { key: 'room_img_5', value: "/LivingRoom.webp", label: "Living Space Image", type: 'image', section: 'Accommodations' },

  // Concierge
  { key: 'concierge_title', value: "Your Adventure Concierge", label: 'Concierge Title', section: 'Concierge' },
  { key: 'concierge_desc', value: "From lift ticket arrangements and fishing guide recommendations to fresh local provisions and trail maps, our team helps you make the most of your Sierra adventure. Focus on the fun—we'll handle the details.", label: 'Concierge Description', type: 'textarea', section: 'Concierge' },

  // Footer
  { key: 'footer_title', value: 'Ready for your Sierra adventure?', label: 'Footer Title', section: 'Footer' },
  { key: 'footer_button', value: 'Book Your Stay', label: 'Footer Button', section: 'Footer' },
  { key: 'footer_img', value: '/patio.webp', label: 'Footer Background', type: 'image', section: 'Footer' },

  // Pricing Configuration
  { key: 'base_weekday_price', value: '650', label: 'Base Weekday Price (Mon-Thu)', type: 'number', section: 'Pricing', category: 'Base Rates' },
  { key: 'base_weekend_price', value: '700', label: 'Base Weekend Price (Fri-Sun)', type: 'number', section: 'Pricing', category: 'Base Rates' },
  { key: 'cleaning_fee', value: '150', label: 'Cleaning Fee', type: 'number', section: 'Pricing', category: 'Fees' },
  { key: 'minimum_nights', value: '3', label: 'Minimum Nights Required', type: 'number', section: 'Pricing', category: 'Policies' },

  // Stripe Product IDs (will be populated when admin updates pricing)
  { key: 'stripe_cleaning_product_id', value: '', label: 'Stripe Cleaning Product ID', type: 'text', section: 'Stripe', category: 'Products' },
  { key: 'stripe_cleaning_price_id', value: '', label: 'Stripe Cleaning Price ID', type: 'text', section: 'Stripe', category: 'Prices' },
];

async function main() {
  console.log('Seeding content blocks...');
  for (const block of blocks) {
    await prisma.contentBlock.upsert({
      where: { key: block.key }, // Upsert by key
      update: {
        value: block.value, // UPDATE the value with new content
        label: block.label,
        section: block.section,
        type: block.type || 'text',
      },
      create: {
        key: block.key,
        value: block.value, // Default value
        label: block.label,
        type: block.type || 'text',
        category: 'General',
        section: block.section || 'General'
      }
    });
  }
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
