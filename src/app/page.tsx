"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bed, Users, Bath, MapPin, WifiOff, Tv, Coffee, Waves, ArrowRight, Mountain, Snowflake, Fish, Gem, Utensils, Sparkles, ShoppingBag, Calendar, UserCheck } from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import clsx from "clsx";
import { BookingModal } from "@/components/BookingModal";

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

    return (
        <main className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-brand-gold selection:text-white">
            <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />

            {/* Hero Section */}
            <section className="relative h-[95vh] flex items-center justify-center overflow-hidden">
                <motion.div
                    className="absolute inset-0 z-0"
                    style={{ y: y1 }}
                >
                    <Image
                        src="/Exterior.avif"
                        alt="Whistle Inn Victorian Farmhouse"
                        fill
                        className="object-cover scale-110"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-50/10" />
                </motion.div>

                <motion.div
                    className="relative z-10 text-center max-w-5xl px-6"
                    style={{ opacity: opacityHero }}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                >
                    <div className="mb-4 inline-block px-4 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-white/90 text-sm font-medium tracking-wider uppercase">
                        The Ultimate Freedom
                    </div>
                    <h1 className="text-5xl md:text-8xl font-serif font-bold text-white mb-6 tracking-tight drop-shadow-2xl">
                        Whistle Inn
                        <span className="block text-2xl md:text-4xl font-light mt-4 italic font-sans opacity-90">Live Your Sierra Dream</span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-light">
                        A serene sanctuary hidden in the Alta mountains. Where gold rushes meet powder days,
                        and pure luxury meets untouched wilderness. Peaceful, private, picture-perfect.
                    </p>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <button
                            onClick={() => setIsBookingOpen(true)}
                            className="group relative inline-flex items-center justify-center px-8 py-4 text-white font-semibold transition-all duration-300 ease-in-out bg-brand-gold rounded-full hover:bg-yellow-500 hover:shadow-[0_0_20px_rgba(218,165,32,0.5)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold"
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
            <div className="relative z-20 -mt-20 max-w-6xl mx-auto px-4">
                <FadeIn delay={0.4}>
                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-8 grid grid-cols-2 lg:grid-cols-4 gap-8 md:divide-x divide-gray-100 border border-white/40">
                        {[
                            { icon: Users, label: "14 Guests", sub: "Perfect for reunions" },
                            { icon: Bed, label: "5 Bedrooms", sub: "Spacious comfort" },
                            { icon: Bed, label: "8 Beds", sub: "Flexible sleeping" },
                            { icon: Bath, label: "4.5 Baths", sub: "Luxury amenities" }
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center text-center group cursor-default">
                                <div className="p-3 rounded-full bg-brand-green/5 text-brand-green mb-3 group-hover:bg-brand-green group-hover:text-white transition-colors duration-300">
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className="font-serif font-bold text-xl text-slate-900">{stat.label}</span>
                                <span className="text-sm text-slate-500 mt-1">{stat.sub}</span>
                            </div>
                        ))}
                    </div>
                </FadeIn>
            </div>

            {/* Intro / About */}
            <section className="py-24 md:py-32 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <FadeIn>
                        <h2 className="text-brand-green text-sm font-bold tracking-widest uppercase mb-4">A Year-Round Paradise</h2>
                        <h3 className="font-serif text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">
                            Escape the Noise. <span className="text-brand-gold italic">Awaken Your Soul.</span>
                        </h3>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                        <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
                            Immerse yourself in beauty all around you. Whether it's the thrill of winter ski resorts,
                            the rush of spring fishing, or the serenity of summer gold prospecting, Whistle Inn is your perfect basecamp.
                            Without the crowds. Without the noise. Just pure, unadulterated peace in nature's lap.
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* Parallax Gallery Strip */}
            <section className="py-10 bg-black overflow-hidden relative">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <FadeIn>
                        <h2 className="text-white font-serif text-3xl md:text-4xl mb-12 text-center">Highlights of the Estate</h2>
                    </FadeIn>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[600px] md:h-96">
                        {[
                            { src: "/pool.webp", title: "Saltwater Pool", sub: "Heated & Private" },
                            { src: "/fullkitchen.avif", title: "Chef's Kitchen", sub: "Gather & Feast" },
                            { src: "/entry.jpg", title: "Grand Entrance", sub: "Welcome Home" },
                            { src: "/balcony.webp", title: "Scenic Views", sub: "Sierra Mountains" }
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
                            <h2 className="text-brand-green text-sm font-bold tracking-widest uppercase mb-4">Adventure Awaits</h2>
                            <h3 className="font-serif text-4xl md:text-5xl font-bold text-slate-900">Your Playground in the Wild</h3>
                        </FadeIn>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
                        {[
                            { icon: Snowflake, title: "World-Class Skiing", desc: "Minutes from premier Sierra resorts." },
                            { icon: Fish, title: "Fishing & Hiking", desc: "Pristine lakes and endless forest paths." },
                        ].map((adv, idx) => (
                            <FadeIn key={idx} delay={idx * 0.1}>
                                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="w-14 h-14 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center mb-6">
                                        <adv.icon className="w-7 h-7" />
                                    </div>
                                    <h4 className="font-serif text-xl font-bold text-slate-900 mb-3">{adv.title}</h4>
                                    <p className="text-slate-600 leading-relaxed">{adv.desc}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* Accommodations - Staggered Grid */}
            <section className="py-24 bg-stone-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 px-2">
                        <div>
                            <h2 className="text-brand-green text-sm font-bold tracking-widest uppercase mb-2">Accommodations</h2>
                            <h2 className="font-serif text-4xl font-bold text-slate-900">Sweet Dreams</h2>
                        </div>
                        <p className="text-slate-500 mt-4 md:mt-0 max-w-md text-right md:text-right">
                            Five beautifully curated bedrooms designed for rest and relaxation after a day of mountain adventures.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { title: "Primary Suite", beds: "1 King, 1 Single", img: "/Bedroom1.webp" },
                            { title: "Guest Room 1", beds: "1 Queen Bed", img: "/Bedroom2.avif" },
                            { title: "Family Room", beds: "1 Queen, 1 Double", img: "/Bedroom3.avif" },
                            { title: "Guest Room 2", beds: "1 Queen Bed", img: "/Bedroom4.webp" },
                            { title: "Guest Room 3", beds: "1 Queen Bed", img: "/Bedroom5.webp" },
                            { title: "Living Space", beds: "Sofa Bed Available", img: "/LivingRoom.webp" },
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
                        <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">"Whatever You Need, We've Got You Covered"</h2>
                        <p className="text-white/80 text-lg max-w-2xl mx-auto">
                            We don't just host; we curate. From fresh local bakery deliveries to private event planning,
                            our concierge team is here to make your wildest dreams a reality.
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
                            { icon: WifiOff, title: "Digital Detox", desc: "Disconnect to reconnect" },
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
                    src="/patio.webp"
                    alt="Footer Background"
                    fill
                    className="object-cover opacity-10 absolute inset-0"
                />
                <div className="relative z-10">
                    <FadeIn>
                        <h2 className="font-serif text-4xl text-white mb-8">Ready to create memories?</h2>
                        <button
                            onClick={() => setIsBookingOpen(true)}
                            className="inline-block bg-brand-gold text-slate-900 font-bold py-5 px-10 rounded-full text-lg hover:bg-white transition-all transform hover:scale-105 shadow-2xl"
                        >
                            Reserve Your Dates
                        </button>
                        <p className="mt-12 text-slate-500 text-sm">Hosted by Nora • &copy; 2026 Whistle Inn Private Getaway</p>
                    </FadeIn>
                </div>
            </section>
        </main>
    );
}
