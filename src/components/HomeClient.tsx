"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Bed, Users, Bath, MapPin, WifiOff, Tv, Coffee, Waves, ArrowRight, Mountain, Snowflake, Fish, Gem, Utensils, Sparkles, ShoppingBag, Calendar, UserCheck } from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { BookingModal } from "@/components/BookingModal";
import { HeroImageSlider } from "@/components/HeroImageSlider";
import { ContentProvider } from "@/components/content/ContentProvider";
import { EditableText } from "@/components/content/EditableText";
import { EditableImage } from "@/components/content/EditableImage";

const FadeIn = ({ children, delay = 0, className }: { children: React.ReactNode, delay?: number, className?: string }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Map of content keys to values
type ContentMap = Record<string, string>;

export default function HomeClient({ content }: { content: ContentMap }) {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 150]);
    const opacityHero = useTransform(scrollY, [0, 400], [1, 0]);
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    const t = (key: string, fallback: string) => content[key] || fallback;

    // Construct hero images dynamically
    const heroImageKeys = [
        { key: 'hero_slider_1', defaultSrc: "/Exterior.avif", alt: "Whistle Inn Exterior" },
        { key: 'hero_slider_2', defaultSrc: "/pool.webp", alt: "Pool Area" },
        { key: 'hero_slider_3', defaultSrc: "/1663.jpg", alt: "Snow Tubing" },
        { key: 'hero_slider_4', defaultSrc: "/1673.jpg", alt: "Fly Fishing" },
        { key: 'hero_slider_5', defaultSrc: "/LivingRoom.webp", alt: "Living Room" },
        { key: 'hero_slider_6', defaultSrc: "/1681.jpg", alt: "Gold Panning" },
        { key: 'hero_slider_7', defaultSrc: "/1676.jpg", alt: "Hiking" },
        { key: 'hero_slider_8', defaultSrc: "/1678.jpg", alt: "Snow Play" },
        { key: 'hero_slider_9', defaultSrc: "/DiningArea.webp", alt: "Dining Area" },
    ];

    return (
        <ContentProvider initialContent={content}>
            <main className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-brand-gold selection:text-white">
                <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />

                {/* Hero Section */}
                <section className="relative min-h-screen sm:h-[95vh] flex items-center justify-center overflow-hidden">
                    <motion.div
                        className="absolute inset-0 z-0"
                        style={{ y: y1 }}
                    >
                        {/* Use the new slider component if available, OR fallback to single image */}
                        <HeroImageSlider imageConfig={heroImageKeys} />
                    </motion.div>

                    <motion.div
                        className="relative z-10 text-center max-w-5xl px-4 sm:px-6"
                        style={{ opacity: opacityHero }}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                    >
                        <div className="mb-4 inline-block px-4 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white/90 text-sm font-medium tracking-wider uppercase">
                            The Ultimate Freedom
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-serif font-bold text-white mb-4 sm:mb-6 tracking-tight drop-shadow-2xl leading-tight">
                            <EditableText
                                contentKey="hero_title"
                                defaultValue="Whistle Inn"
                            />
                            <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light mt-2 sm:mt-4 italic font-sans opacity-90">
                                <EditableText
                                    contentKey="hero_subtitle"
                                    defaultValue="Live Your Sierra Dream"
                                />
                            </span>
                        </h1>
                        <div className="text-base sm:text-lg md:text-xl text-white/90 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-light px-2 whitespace-pre-wrap">
                            <EditableText
                                contentKey="hero_description"
                                defaultValue={'A majestic sanctuary hidden in the Alta mountains.\nWhere gold rushes meet powder days, and pure luxury meets untouched wilderness.\nPrivate, comfortable, perfect.'}
                                multiline
                                as="p"
                            />
                        </div>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <button
                                onClick={() => setIsBookingOpen(true)}
                                className="group relative inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-white font-semibold transition-all duration-300 ease-in-out bg-brand-gold rounded-full hover:bg-yellow-500 hover:shadow-[0_0_20px_rgba(218,165,32,0.5)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold active:scale-95 touch-manipulation min-h-[48px]"
                            >
                                Book Your Stay
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    </motion.div>

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce">
                        <div className="w-[1px] h-12 bg-white/30 mx-auto" />
                    </div>
                </section>

                {/* Quick Stats - Floating Card */}
                <div className="relative z-20 -mt-12 sm:-mt-20 max-w-6xl mx-auto px-4">
                    <FadeIn delay={0.4}>
                        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 lg:divide-x divide-gray-100 border border-white/40">
                            {[
                                { icon: Users, label: t('stats_guests', "14 Guests"), sub: t('stats_guests_sub', "Perfect for reunions") },
                                { icon: Bed, label: t('stats_bedrooms', "5 Bedrooms"), sub: t('stats_bedrooms_sub', "Spacious comfort") },
                                { icon: Bed, label: t('stats_beds', "8 Beds"), sub: t('stats_beds_sub', "Flexible sleeping") },
                                { icon: Bath, label: t('stats_baths', "4.5 Baths"), sub: t('stats_baths_sub', "Luxury amenities") }
                            ].map((stat, i) => (
                                <div key={i} className="flex flex-col items-center text-center group cursor-default min-h-[80px] justify-center">
                                    <div className="p-2 sm:p-3 rounded-full bg-brand-green/5 text-brand-green mb-2 sm:mb-3 group-hover:bg-brand-green group-hover:text-white transition-colors duration-300">
                                        <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <span className="font-serif font-bold text-lg sm:text-xl text-slate-900">{stat.label}</span>
                                    <span className="text-xs sm:text-sm text-slate-500 mt-1">{stat.sub}</span>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                </div>

                {/* Intro / About */}
                <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <FadeIn>
                            <h2 className="text-brand-green text-xs sm:text-sm font-bold tracking-widest uppercase mb-3 sm:mb-4">{t('about_pill', 'A Year-Round Paradise')}</h2>
                            <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 sm:mb-8 leading-tight px-2">
                                {t('about_title', 'Escape to the Mountains.')} <span className="text-brand-gold italic">{t('about_title_highlight', 'Awaken Your Soul.')}</span>
                            </h3>
                        </FadeIn>
                        <FadeIn delay={0.2}>
                            <p className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto px-2">
                                {t('about_description', "Immerse yourself in beauty all around you. Whether it's the thrill of winter ski resorts, the rush of spring fishing, or the joy of summer gold prospecting, Whistle Inn is your perfect basecamp. Without the crowds. Just pure, unadulterated beauty in nature's lap.")}
                            </p>
                        </FadeIn>
                    </div>
                </section>

                {/* Parallax Gallery Strip */}
                <section className="py-8 sm:py-10 bg-black overflow-hidden relative">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <FadeIn>
                            <h2 className="text-white font-serif text-2xl sm:text-3xl md:text-4xl mb-8 sm:mb-12 text-center px-2">{t('highlights_title', 'Highlights of the Estate')}</h2>
                        </FadeIn>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 h-auto sm:h-[600px] md:h-96">
                            {[
                                { src: t('highlight_1_image', "/pool.webp"), title: t('highlight_1_title', "Saltwater Pool"), sub: t('highlight_1_sub', "Heated & Private") },
                                { src: t('highlight_2_image', "/fullkitchen.avif"), title: t('highlight_2_title', "Chef's Kitchen"), sub: t('highlight_2_sub', "Gather & Feast") },
                                { src: t('highlight_3_image', "/entry.jpg"), title: t('highlight_3_title', "Grand Entrance"), sub: t('highlight_3_sub', "Welcome Home") },
                                { src: t('highlight_4_image', "/balcony.webp"), title: t('highlight_4_title', "Scenic Views"), sub: t('highlight_4_sub', "Sierra Mountains") }
                            ].map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    className="relative h-full rounded-xl overflow-hidden group cursor-pointer"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <Image
                                        src={item.src}
                                        alt={item.title}
                                        fill
                                        className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                    <div className="absolute bottom-6 left-6 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                        <h4 className="font-serif text-2xl font-bold">{item.title}</h4>
                                        <p className="text-white/80 text-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">{item.sub}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Local Adventures Section - NEW */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <FadeIn>
                                <h2 className="text-brand-green text-sm font-bold tracking-widest uppercase mb-4">{t('adventures_pill', 'Adventure Awaits')}</h2>
                                <h3 className="font-serif text-4xl md:text-5xl font-bold text-slate-900 mb-6">{t('adventures_title', 'Your Playground in the Wild')}</h3>
                                <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                                    {t('adventures_intro', 'Beyond the comfort of Whistle Inn, a world of natural beauty and excitement awaits. Explore the stunning Sierra Nevada foothills, where every season offers a new adventure.')}
                                </p>
                            </FadeIn>
                        </div>

                        {/* Image Gallery Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                            {[
                                { src: t('adventure_gallery_1', "/1663.jpg"), alt: "Kids Snow Tubing Fun" },
                                { src: t('adventure_gallery_2', "/1673.jpg"), alt: "Fly Fishing on American River" },
                                { src: t('adventure_gallery_3', "/1676.jpg"), alt: "Scenic Sierra Hiking" },
                                { src: t('adventure_gallery_4', "/1678.jpg"), alt: "Family Snow Play" },
                                { src: t('adventure_gallery_5', "/1681.jpg"), alt: "Gold Panning Adventure" },
                                { src: t('adventure_gallery_6', "/1687.jpg"), alt: "Skiing and Snowboarding" },
                            ].map((image, idx) => (
                                <FadeIn key={idx} delay={idx * 0.1}>
                                    <div className="relative h-72 w-full rounded-xl overflow-hidden shadow-lg group">
                                        <Image
                                            src={image.src}
                                            alt={image.alt}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-end p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <p className="text-white text-lg font-semibold">{image.alt}</p>
                                        </div>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>

                        {/* Ski Resorts Section */}
                        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                            <FadeIn>
                                <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
                                    <Image
                                        src={t('adventure_ski_image', "/1689.jpg")}
                                        alt="Skiing in the Sierra Nevada"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </FadeIn>
                            <FadeIn delay={0.2}>
                                <div>
                                    <div className="inline-flex items-center gap-2 mb-4 text-brand-gold">
                                        <Snowflake className="w-5 h-5" />
                                        <span className="text-sm font-bold tracking-widest uppercase">{t('ski_pill', 'Winter Wonderland')}</span>
                                    </div>
                                    <h3 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                                        {t('ski_title', 'World-Class Ski Resorts Nearby')}
                                    </h3>
                                    <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                                        {t('ski_p1', "Just a short drive from Whistle Inn, you'll find some of California's most renowned ski resorts. Embrace the thrill of fresh powder at world-class destinations like Dodge Ridge, Bear Valley, and the legendary resorts of Lake Tahoe, offering slopes for every skill level and breathtaking views of the snow-capped Sierra Nevada.")}
                                    </p>
                                    <p className="text-lg text-slate-600 leading-relaxed">
                                        {t('ski_p2', "Whether you're a seasoned pro or trying skiing or snowboarding for the first time, the nearby resorts promise unforgettable winter adventures and cozy après-ski moments.")}
                                    </p>
                                </div>
                            </FadeIn>
                        </div>

                        {/* Fly Fishing Section */}
                        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                            <FadeIn className="order-2 md:order-1">
                                <div>
                                    <div className="inline-flex items-center gap-2 mb-4 text-brand-green">
                                        <Fish className="w-5 h-5" />
                                        <span className="text-sm font-bold tracking-widest uppercase">{t('fish_pill', 'Pristine Waters')}</span>
                                    </div>
                                    <h3 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                                        {t('fish_title', 'Fly Fishing on the American & Truckee Rivers')}
                                    </h3>
                                    <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                                        {t('fish_p1', 'The American and Truckee Rivers, celebrated for their pristine waters and abundant trout, are just moments away. Cast your line into crystal-clear streams amidst stunning natural beauty, where the rhythm of the river and the challenge of the catch offer a truly memorable escape.')}
                                    </p>
                                    <p className="text-lg text-slate-600 leading-relaxed">
                                        {t('fish_p2', "Experience the joy of fly fishing in one of Northern California's most picturesque settings—perfect for both seasoned anglers and those looking to discover a new passion.")}
                                    </p>
                                </div>
                            </FadeIn>
                            <FadeIn delay={0.2} className="order-1 md:order-2">
                                <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
                                    <Image
                                        src={t('adventure_fish_image', "/1691.jpg")}
                                        alt="Fly Fishing on American River"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </FadeIn>
                        </div>

                        {/* Serenity Section */}
                        <div className="text-center py-16 max-w-4xl mx-auto">
                            <FadeIn>
                                <div className="inline-flex items-center gap-2 mb-4 text-brand-gold">
                                    <Mountain className="w-5 h-5" />
                                    <span className="text-sm font-bold tracking-widest uppercase">{t('serenity_pill', 'Relax and Unwind')}</span>
                                </div>
                                <h3 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                                    {t('serenity_title', 'A Majestic Mountain Escape')}
                                </h3>
                                <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                                    {t('serenity_p1', "Whistle Inn offers more than just a place to stay—it's an invitation to unwind in a majestic setting, far from the urban hustle. Here, you can relax under the pines and enjoy the mountain atmosphere.")}
                                </p>
                                <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                                    {t('serenity_p2', 'Reconnect with loved ones and yourself under a blanket of stars, where the absence of city lights reveals the true splendor of the night sky. No city traffic. Just pure mountain vibes.')}
                                </p>
                                <p className="text-xl text-brand-green font-semibold italic">
                                    {t('serenity_quote', 'Discover true relaxation in the heart of the Sierra Foothills.')}
                                </p>
                            </FadeIn>
                        </div>
                    </div>
                </section>

                {/* Accommodations - Staggered Grid */}
                <section className="py-24 bg-stone-50">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-16 px-2">
                            <div>
                                <h2 className="text-brand-green text-sm font-bold tracking-widest uppercase mb-2">Accommodations</h2>
                                <h2 className="font-serif text-4xl font-bold text-slate-900">{t('rooms_title', 'Sweet Dreams')}</h2>
                            </div>
                            <p className="text-slate-500 mt-4 md:mt-0 max-w-md text-right md:text-right">
                                {t('rooms_description', 'Five beautifully curated bedrooms designed for rest and relaxation after a day of mountain adventures.')}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { title: t('room_1_title', "Primary Suite"), beds: t('room_1_beds', "1 King, 1 Single"), img: t('room_1_img', "/Bedroom1.webp") },
                                { title: t('room_2_title', "Guest Room 1"), beds: t('room_2_beds', "1 Queen Bed"), img: t('room_2_img', "/Bedroom2.avif") },
                                { title: t('room_3_title', "Family Room"), beds: t('room_3_beds', "1 Queen, 1 Double"), img: t('room_3_img', "/Bedroom3.avif") },
                                { title: t('room_4_title', "Guest Room 2"), beds: t('room_4_beds', "1 Queen Bed"), img: t('room_4_img', "/Bedroom4.webp") },
                                { title: t('room_5_title', "Guest Room 3"), beds: t('room_5_beds', "1 Queen Bed"), img: t('room_5_img', "/Bedroom5.webp") },
                                { title: t('room_6_title', "Living Space"), beds: t('room_6_beds', "Sofa Bed Available"), img: t('room_6_img', "/LivingRoom.webp") },
                            ].map((room, idx) => (
                                <FadeIn key={idx} delay={idx * 0.1}>
                                    <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-stone-100">
                                        <div className="relative h-64 overflow-hidden">
                                            <Image
                                                src={room.img}
                                                alt={room.title}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                        </div>
                                        <div className="p-6">
                                            <h3 className="font-serif text-xl font-bold text-slate-900 group-hover:text-brand-gold transition-colors">{room.title}</h3>
                                            <div className="flex items-center mt-2 text-slate-500">
                                                <Bed className="w-4 h-4 mr-2" />
                                                <span className="text-sm font-medium">{room.beds}</span>
                                            </div>
                                        </div>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Amenities - Dark Mode -> Renamed to Concierge */}
                <section className="py-24 bg-brand-green text-white relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl rounded-full mix-blend-overlay" />
                    <div className="absolute -left-20 bottom-0 w-80 h-80 bg-white/5 rounded-full blur-3xl rounded-full mix-blend-overlay" />

                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <div className="text-center mb-20">
                            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">"{t('concierge_title', 'Whatever You Need, We\'ve Got You Covered')}"</h2>
                            <p className="text-white/80 text-lg max-w-2xl mx-auto">
                                {t('concierge_subtitle', "We don't just host; we curate. From fresh local bakery deliveries to private event planning, our concierge team is here to make your wildest dreams a reality.")}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                            {[
                                { icon: Utensils, title: t('concierge_item_1_title', "Personal Chef"), desc: t('concierge_item_1_desc', "Gourmet meals prepared in your kitchen") },
                                { icon: ShoppingBag, title: t('concierge_item_2_title', "Fresh Bakery Delivery"), desc: t('concierge_item_2_desc', "Local goods delivered to your door") },
                                { icon: Sparkles, title: t('concierge_item_3_title', "On-Demand Cleaning"), desc: t('concierge_item_3_desc', "Daily housekeeping services available") },
                                { icon: Calendar, title: t('concierge_item_4_title', "Event Planning"), desc: t('concierge_item_4_desc', "Retreats, reunions, and celebrations") },
                                { icon: UserCheck, title: t('concierge_item_5_title', "Local Adventure Guides"), desc: t('concierge_item_5_desc', "Expert locals to lead the way") },
                                { icon: ShoppingBag, title: t('concierge_item_6_title', "Shopping Assistant"), desc: t('concierge_item_6_desc', "Fully stocked fridge upon arrival") },
                                { icon: WifiOff, title: t('concierge_item_7_title', "Digital Detox"), desc: t('concierge_item_7_desc', "Disconnect to reconnect") },
                                { icon: MapPin, title: t('concierge_item_8_title', "Anything You Want"), desc: t('concierge_item_8_desc', "Just ask, and we'll make it happen") },
                            ].map((amenity, idx) => (
                                <FadeIn key={idx} delay={idx * 0.1}>
                                    <div className="flex flex-col items-center text-center group">
                                        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-sm group-hover:bg-brand-gold group-hover:text-black transition-all duration-300 transform group-hover:-translate-y-2 shadow-lg">
                                            <amenity.icon className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3">{amenity.title}</h3>
                                        <p className="text-white/60 leading-relaxed group-hover:text-white/90 transition-colors">{amenity.desc}</p>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* House Rules */}
                <section className="py-16 bg-slate-100">
                    <div className="max-w-3xl mx-auto px-6">
                        <FadeIn>
                            <h2 className="font-serif text-3xl font-bold text-slate-900 mb-8 text-center">House Rules</h2>
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-wrap">
                                    {t('house_rules', '1. No smoking inside.\n2. Pets allowed on approval.\n3. Verify quiet hours.')}
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </section>

                {/* CTA / Footer */}
                <section className="py-24 bg-slate-900 text-center px-6 relative overflow-hidden">
                    <Image
                        src={t('footer_bg_image', "/patio.webp")}
                        alt="Footer Background"
                        fill
                        className="object-cover opacity-10 absolute inset-0"
                    />
                    <div className="relative z-10">
                        <FadeIn>
                            <h2 className="font-serif text-4xl text-white mb-8">{t('footer_title', 'Ready to create memories?')}</h2>
                            <NewsletterSignup />
                            <button
                                onClick={() => setIsBookingOpen(true)}
                                className="inline-block bg-brand-gold text-slate-900 font-bold py-5 px-10 rounded-full text-lg hover:bg-white transition-all transform hover:scale-105 shadow-2xl mt-6"
                            >
                                Reserve Your Dates
                            </button>
                            <p className="mt-12 text-slate-500 text-sm">Hosted by Nora • &copy; 2026 Whistle Inn Private Getaway</p>
                        </FadeIn>
                    </div>
                </section>

            </main>
        </ContentProvider>
    );
}
