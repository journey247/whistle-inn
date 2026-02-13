"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bed, Users, Bath, MapPin, WifiOff, Tv, Coffee, Waves, ArrowRight, Mountain, Snowflake, Fish, Gem, Utensils, Sparkles, ShoppingBag, Calendar, UserCheck, Edit2 } from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import clsx from "clsx";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { BookingModal } from "@/components/BookingModal";
import { HeroImageSlider, useHeroSlider, images } from "@/components/HeroImageSlider";
import { useContent } from "@/components/content/ContentProvider";

// Helper to render editable content
const EditableText = ({ id, fallback, className = "" }: { id: string, fallback: string, className?: string }) => {
    const { content, isEditMode, updateContent, isAdmin } = useContent();
    // Use fallback if content[id] is undefined or empty string, but allow empty string if intended? 
    // Usually fallback is better for initial state.
    const text = content[id] !== undefined ? content[id] : fallback;

    if (isEditMode && isAdmin) {
        return (
            <span
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateContent(id, e.currentTarget.textContent || "")}
                className={`outline-dashed outline-2 outline-brand-gold bg-yellow-50/50 p-1 rounded cursor-text ${className}`}
                onClick={(e) => e.stopPropagation()} // Prevent click from triggering parent elements
            >
                {text}
            </span>
        );
    }
    return <span className={className}>{text}</span>;
};

// Admin Toggle Button
const AdminControls = () => {
    const { isAdmin, isEditMode, toggleEditMode } = useContent();
    // Only show if we confirm admin status (client side check usually via local token or context)
    // The verifyAdmin in API protects writes, but here we just hide UI.
    // Ideally we check a token availability. For now, we assume useContent handles isAdmin logic.
    if (!isAdmin) return null;

    return (
        <button
            onClick={toggleEditMode}
            className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all ${isEditMode ? 'bg-brand-gold text-white' : 'bg-white text-slate-800 border border-slate-200'}`}
            title="Toggle Edit Mode"
        >
            <Edit2 size={24} />
        </button>
    );
};

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

export default function Home() {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 150]);
    const opacityHero = useTransform(scrollY, [0, 400], [1, 0]);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const { content } = useContent();
    const { currentImage } = useHeroSlider(images);

    return (
        <main className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-brand-gold selection:text-white">
            <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
            <AdminControls />

            {/* Hero Section */}
            <section className="relative min-h-screen sm:h-[95vh] flex items-center justify-center overflow-hidden">
                <motion.div
                    className="absolute inset-0 z-0"
                    style={{ y: y1 }}
                >
                    <HeroImageSlider images={images} />
                </motion.div>

                <motion.div
                    className="relative z-10 text-center max-w-5xl px-4 sm:px-6"
                    style={{ opacity: opacityHero }}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                >
                    <div className="mb-4 inline-block px-4 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white/90 text-sm font-medium tracking-wider uppercase">
                        <EditableText id="hero_pill" fallback="The Ultimate Freedom" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-serif font-bold text-white mb-4 sm:mb-6 tracking-tight drop-shadow-2xl leading-tight">
                        <EditableText id="hero_title" fallback="Whistle Inn" />
                        <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light mt-2 sm:mt-4 italic font-sans opacity-90">
                            <EditableText id="hero_subtitle" fallback="Live Your Sierra Dream" />
                        </span>
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-light px-2">
                        <EditableText id="hero_desc" fallback="A thrilling sanctuary nestled in the Alta mountains. Where gold rushes meet powder days, and pure luxury meets the rhythmic pulse of passing trains. Vibrant, private, picture-perfect." />
                    </p>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <button
                            onClick={() => setIsBookingOpen(true)}
                            className="group relative inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-white font-semibold transition-all duration-300 ease-in-out bg-brand-gold rounded-full hover:bg-yellow-500 hover:shadow-[0_0_20px_rgba(218,165,32,0.5)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold active:scale-95 touch-manipulation min-h-[48px]"
                        >
                            <EditableText id="hero_button" fallback="Book Your Stay" />
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </motion.div>

                {/* Photo Attribution */}
                {currentImage.attribution && (
                    <div className="absolute bottom-20 sm:bottom-24 right-4 sm:right-8 z-20 max-w-[90vw] sm:max-w-md">
                        <p className="text-white text-xs sm:text-sm bg-black/80 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-xl font-medium border border-white/30 whitespace-nowrap">
                            {currentImage.attribution}
                        </p>
                    </div>
                )}

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce">
                    <div className="w-[1px] h-12 bg-white/30 mx-auto" />
                </div>
            </section>

            {/* Quick Stats - Floating Card */}
            <div className="relative z-20 -mt-12 sm:-mt-20 max-w-6xl mx-auto px-4">
                <FadeIn delay={0.4}>
                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 lg:divide-x divide-gray-100 border border-white/40">
                        {[
                            { icon: Users, label: "14 Guests", sub: "Perfect for reunions", id_label: "stat_1_label", id_sub: "stat_1_sub" },
                            { icon: Bed, label: "5 Bedrooms", sub: "Spacious comfort", id_label: "stat_2_label", id_sub: "stat_2_sub" },
                            { icon: Bed, label: "8 Beds", sub: "Flexible sleeping", id_label: "stat_3_label", id_sub: "stat_3_sub" },
                            { icon: Bath, label: "4.5 Baths", sub: "Luxury amenities", id_label: "stat_4_label", id_sub: "stat_4_sub" }
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center text-center group cursor-default min-h-[80px] justify-center">
                                <div className="p-2 sm:p-3 rounded-full bg-brand-green/5 text-brand-green mb-2 sm:mb-3 group-hover:bg-brand-green group-hover:text-white transition-colors duration-300">
                                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <span className="font-serif font-bold text-lg sm:text-xl text-slate-900">
                                    <EditableText id={stat.id_label} fallback={stat.label} />
                                </span>
                                <span className="text-xs sm:text-sm text-slate-500 mt-1">
                                    <EditableText id={stat.id_sub} fallback={stat.sub} />
                                </span>
                            </div>
                        ))}
                    </div>
                </FadeIn>
            </div>

            {/* Intro / About */}
            <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <FadeIn>
                        <h2 className="text-brand-green text-xs sm:text-sm font-bold tracking-widest uppercase mb-3 sm:mb-4">
                            <EditableText id="intro_small" fallback="A Train Lover's Paradise" />
                        </h2>
                        <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 sm:mb-8 leading-tight px-2">
                            <EditableText id="intro_title" fallback="Embrace the Rhythm." /> <span className="text-brand-gold italic"><EditableText id="intro_title_accent" fallback="Live Your Adventure." /></span>
                        </h3>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                        <p className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto px-2">
                            <EditableText id="intro_desc" fallback="Immerse yourself in beauty all around you. Whether it's the thrill of winter ski resorts, the rush of spring fishing, or the excitement of summer gold prospecting, Whistle Inn is your perfect basecamp. With the rhythmic symphony of passing trains as your soundtrack. Without the crowds. Just pure, unadulterated adventure in nature's embrace." />
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* Parallax Gallery Strip */}
            <section className="py-8 sm:py-10 bg-black overflow-hidden relative">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <FadeIn>
                        <h2 className="text-white font-serif text-2xl sm:text-3xl md:text-4xl mb-8 sm:mb-12 text-center px-2">
                            <EditableText id="highlights_title" fallback="Highlights of the Estate" />
                        </h2>
                    </FadeIn>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 h-auto sm:h-[600px] md:h-96">

                        {[
                            { src: "/pool.webp", title: "Saltwater Pool", sub: "Heated & Private", imgKey: "highlight_img_0" },
                            { src: "/fullkitchen.avif", title: "Chef's Kitchen", sub: "Gather & Feast", imgKey: "highlight_img_1" },
                            { src: "/DiningArea.webp", title: "Dining Area", sub: "Gather Together", imgKey: "highlight_img_2" },
                            { src: "/balcony.webp", title: "Scenic Views", sub: "Sierra Mountains", imgKey: "highlight_img_3" }
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
                                    src={content[item.imgKey] || item.src}
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
                            <h2 className="text-brand-green text-sm font-bold tracking-widest uppercase mb-4">
                                <EditableText id="adventures_small" fallback="Adventure Awaits" />
                            </h2>
                            <h3 className="font-serif text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                                <EditableText id="adventures_title" fallback="Your Playground in the Wild" />
                            </h3>
                            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                                <EditableText id="adventures_desc" fallback="Beyond the comfort of Whistle Inn, a world of natural beauty and excitement awaits. Explore the stunning Sierra Nevada foothills, where every season offers a new adventure." />
                            </p>
                        </FadeIn>
                    </div>

                    {/* Image Gallery Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                        {[
                            { src: "/1650.webp", alt: "Kids Snow Tubing Fun" },
                            { src: "/fullbath1.jpg", alt: "Fly Fishing on American River" },
                            { src: "/fullbath2.webp", alt: "Scenic Sierra Hiking" },
                            { src: "/fullbath3.webp", alt: "Family Snow Play" },
                            { src: "/fullbath4.webp", alt: "Gold Panning Adventure" },
                            { src: "/pool@night.webp", alt: "Skiing and Snowboarding" },
                        ].map((image, idx) => (
                            <FadeIn key={idx} delay={idx * 0.1}>
                                <div className="relative h-72 w-full rounded-xl overflow-hidden shadow-lg group">
                                    <Image
                                        src={content[`adventure_img_${idx}`] || image.src}
                                        alt={image.alt}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                    {/* Ski Resorts Section */}
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                        <FadeIn>
                            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
                                <Image
                                    src={content['resort_img'] || "/Poolrock.webp"}
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
                                    <span className="text-sm font-bold tracking-widest uppercase">
                                        <EditableText id="winter_small" fallback="Winter Wonderland" />
                                    </span>
                                </div>
                                <h3 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                                    <EditableText id="winter_title" fallback="World-Class Ski Resorts Nearby" />
                                </h3>
                                <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                                    <EditableText id="winter_desc_1" fallback="Just a short drive from Whistle Inn, you'll find some of California's most renowned ski resorts. Embrace the thrill of fresh powder at world-class destinations like Dodge Ridge, Bear Valley, and the legendary resorts of Lake Tahoe, offering slopes for every skill level and breathtaking views of the snow-capped Sierra Nevada." />
                                </p>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    <EditableText id="winter_desc_2" fallback="Whether you're a seasoned pro or trying skiing or snowboarding for the first time, the nearby resorts promise unforgettable winter adventures and cozy après-ski moments." />
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
                                    <span className="text-sm font-bold tracking-widest uppercase">
                                        <EditableText id="fishing_small" fallback="Pristine Waters" />
                                    </span>
                                </div>
                                <h3 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                                    <EditableText id="fishing_title" fallback="Fly Fishing on the American & Truckee Rivers" />
                                </h3>
                                <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                                    <EditableText id="fishing_desc_1" fallback="The American and Truckee Rivers, celebrated for their pristine waters and abundant trout, are just moments away. Cast your line into crystal-clear streams amidst stunning natural beauty, where the rhythm of the river and the challenge of the catch offer an exhilarating adventure." />
                                </p>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    <EditableText id="fishing_desc_2" fallback="Experience the thrill of fly fishing in one of Northern California's most picturesque settings—perfect for both seasoned anglers and those looking to discover a new passion." />
                                </p>
                            </div>
                        </FadeIn>
                        <FadeIn delay={0.2} className="order-1 md:order-2">
                            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
                                <Image
                                    src={content['fishing_img'] || "/Poolrock.webp"}
                                    alt="Fly Fishing on American River"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </FadeIn>
                    </div>

                    {/* Train Lovers Paradise Section */}
                    <div className="text-center py-16 max-w-4xl mx-auto">
                        <FadeIn>
                            <div className="inline-flex items-center gap-2 mb-4 text-brand-gold">
                                <Mountain className="w-5 h-5" />
                                <span className="text-sm font-bold tracking-widest uppercase">
                                    <EditableText id="serenity_small" fallback="Railroad Paradise" />
                                </span>
                            </div>
                            <h3 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                                <EditableText id="serenity_title" fallback="A Train Enthusiast's Dream Destination" />
                            </h3>
                            <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                                <EditableText id="serenity_desc_1" fallback="Whistle Inn offers more than just a place to stay—it's an invitation to experience the magic of railroading in a majestic setting, perfectly positioned along active railroad tracks. Here, the sounds are the powerful rumble of locomotives and the melodic whistle of passing trains." />
                            </p>
                            <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                                <EditableText id="serenity_desc_2" fallback="Watch freight trains thunder by with their colorful cargo containers, passenger trains glide through with their rhythmic clatter, and feel the earth vibrate with each mighty passage. The nearby railroad corridor offers endless opportunities for train watching, photography, and experiencing the romance of rail travel." />
                            </p>
                            <p className="text-xl text-brand-green font-semibold italic">
                                <EditableText id="serenity_accent" fallback="Discover the heartbeat of the Sierra Foothills railroad." />
                            </p>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* Train Notice - Transparent Disclosure */}
            <section className="py-12 bg-amber-50 border-y-2 border-amber-200">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <FadeIn>
                        <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-amber-500">
                            <h3 className="font-serif text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                                <EditableText id="train_notice_title" fallback="About the Railroad" />
                            </h3>
                            <p className="text-lg text-slate-700 leading-relaxed">
                                <EditableText id="train_notice_desc" fallback="Enjoy views of the historic railroad from the property. Trains pass through the area periodically adding to the authentic Sierra mountain experience. While most guests find it charming, train noise may be noticeable at times." />
                            </p>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Accommodations - Staggered Grid */}
            <section className="py-24 bg-stone-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 px-2">
                        <div>
                            <h2 className="text-brand-green text-sm font-bold tracking-widest uppercase mb-2">
                                <EditableText id="accomm_small" fallback="Accommodations" />
                            </h2>
                            <h2 className="font-serif text-4xl font-bold text-slate-900">
                                <EditableText id="accomm_title" fallback="Sweet Dreams" />
                            </h2>
                        </div>
                        <div className="text-slate-500 mt-4 md:mt-0 max-w-md text-right md:text-right">
                            <EditableText id="accomm_desc" fallback="Five beautifully curated bedrooms designed for rest and relaxation after a day of mountain adventures." />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { title: "Primary Suite", beds: "1 King, 1 Single", img: "/Bedroom1.webp", id_title: "room_1_title", id_beds: "room_1_beds" },
                            { title: "Guest Room 1", beds: "1 Queen Bed", img: "/Bedroom2.avif", id_title: "room_2_title", id_beds: "room_2_beds" },
                            { title: "Family Room", beds: "1 Queen, 1 Double", img: "/Bedroom3.avif", id_title: "room_3_title", id_beds: "room_3_beds" },
                            { title: "Guest Room 2", beds: "1 Queen Bed", img: "/Bedroom4.webp", id_title: "room_4_title", id_beds: "room_4_beds" },
                            { title: "Guest Room 3", beds: "1 Queen Bed", img: "/Bedroom5.webp", id_title: "room_5_title", id_beds: "room_5_beds" },
                            { title: "Living Space", beds: "Sofa Bed Available", img: "/LivingRoom.webp", id_title: "room_6_title", id_beds: "room_6_beds" },
                        ].map((room, idx) => (
                            <FadeIn key={idx} delay={idx * 0.1}>
                                <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-stone-100">
                                    <div className="relative h-64 overflow-hidden">
                                        <Image
                                            src={content[`room_img_${idx}`] || room.img}
                                            alt={room.title}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                    </div>
                                    <div className="p-6">
                                        <h3 className="font-serif text-xl font-bold text-slate-900 group-hover:text-brand-gold transition-colors">
                                            <EditableText id={room.id_title} fallback={room.title} />
                                        </h3>
                                        <div className="flex items-center mt-2 text-slate-500">
                                            <Bed className="w-4 h-4 mr-2" />
                                            <span className="text-sm font-medium">
                                                <EditableText id={room.id_beds} fallback={room.beds} />
                                            </span>
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
                        <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
                            "<EditableText id="concierge_title" fallback="Whatever You Need, We've Got You Covered" />"
                        </h2>
                        <p className="text-white/80 text-lg max-w-2xl mx-auto">
                            <EditableText id="concierge_desc" fallback="We don't just host; we curate. From fresh local bakery deliveries to private event planning, our concierge team is here to make your wildest dreams a reality." />
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                        {[
                            { icon: Utensils, title: "Personal Chef", desc: "Gourmet meals prepared in your kitchen" },
                            { icon: ShoppingBag, title: "Fresh Bakery Delivery", desc: "Local goods delivered to your door" },
                            { icon: Sparkles, title: "On-Demand Cleaning", desc: "Daily housekeeping services available" },
                            { icon: Calendar, title: "Event Planning", desc: "Retreats, reunions, and celebrations" },
                            { icon: UserCheck, title: "Local Adventure Guides", desc: "Expert locals to lead the way" },
                            { icon: ShoppingBag, title: "Shopping Assistant", desc: "Fully stocked fridge upon arrival" },
                            { icon: MapPin, title: "Prime Train Viewing", desc: "Front-row seats to railroad action" },
                            { icon: MapPin, title: "Anything You Want", desc: "Just ask, and we'll make it happen" },
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

            {/* CTA / Footer */}
            <section className="py-24 bg-slate-900 text-center px-6 relative overflow-hidden">
                <Image
                    src={content['footer_img'] || "/patio.webp"}
                    alt="Footer Background"
                    fill
                    className="object-cover opacity-10 absolute inset-0"
                />
                <div className="relative z-10">
                    <FadeIn>
                        <h2 className="font-serif text-4xl text-white mb-8">
                            <EditableText id="footer_title" fallback="Ready to create memories?" />
                        </h2>
                        <NewsletterSignup />
                        <button
                            onClick={() => setIsBookingOpen(true)}
                            className="inline-block bg-brand-gold text-slate-900 font-bold py-5 px-10 rounded-full text-lg hover:bg-white transition-all transform hover:scale-105 shadow-2xl mt-6"
                        >
                            <EditableText id="footer_button" fallback="Reserve Your Dates" />
                        </button>
                        <p className="mt-12 text-slate-500 text-sm">Hosted by Nora • &copy; 2026 Whistle Inn Private Getaway</p>
                    </FadeIn>
                </div>
            </section>

        </main>
    );
}
