"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type GalleryImage = {
    src: string;
    alt: string;
    category: string;
};

const GALLERY_IMAGES: GalleryImage[] = [
    // Exterior & Property
    { src: "/Exterior.avif", alt: "Whistle Inn exterior — Victorian Farmhouse", category: "Exterior" },
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
];

const CATEGORIES = ["All", ...Array.from(new Set(GALLERY_IMAGES.map(img => img.category)))];

export default function GalleryPage() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const filtered = activeCategory === "All"
        ? GALLERY_IMAGES
        : GALLERY_IMAGES.filter(img => img.category === activeCategory);

    const openLightbox = (index: number) => setLightboxIndex(index);
    const closeLightbox = () => setLightboxIndex(null);

    const goPrev = () => {
        if (lightboxIndex === null) return;
        setLightboxIndex((lightboxIndex - 1 + filtered.length) % filtered.length);
    };

    const goNext = () => {
        if (lightboxIndex === null) return;
        setLightboxIndex((lightboxIndex + 1) % filtered.length);
    };

    const currentImage = lightboxIndex !== null ? filtered[lightboxIndex] : null;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition font-medium text-sm">
                        <Home className="w-4 h-4" />
                        Back to Whistle Inn
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 font-serif">Photo Gallery</h1>
                    <div className="w-24" />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero text */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-serif mb-2">
                        Experience Whistle Inn
                    </h2>
                    <p className="text-slate-500 max-w-lg mx-auto">
                        A Victorian Farmhouse retreat in the Sierra Nevada — explore every room, every view.
                    </p>
                </div>

                {/* Category filter */}
                <div className="flex flex-wrap gap-2 justify-center mb-8">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                activeCategory === cat
                                    ? "bg-brand-gold text-white shadow-md"
                                    : "bg-white text-slate-600 border border-slate-200 hover:border-brand-gold hover:text-brand-gold"
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Masonry-style grid */}
                <motion.div
                    layout
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
                >
                    <AnimatePresence>
                        {filtered.map((img, index) => (
                            <motion.button
                                key={img.src}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => openLightbox(index)}
                                className="group relative aspect-square rounded-xl overflow-hidden bg-slate-200 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                            >
                                <Image
                                    src={img.src}
                                    alt={img.alt}
                                    fill
                                    // Thumbnails render in a 2/3/4-column grid, so
                                    // never ship more than ~1/2 viewport width.
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    quality={75}
                                    priority={index < 4}
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-end p-3">
                                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded-full truncate max-w-full">
                                        {img.alt}
                                    </span>
                                </div>
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* CTA */}
                <div className="text-center mt-16 py-12 border-t border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-900 font-serif mb-3">Ready to book your stay?</h3>
                    <p className="text-slate-500 mb-6">Up to 14 guests · 5 bedrooms · Alta, California</p>
                    <Link
                        href="/"
                        className="inline-flex items-center px-8 py-4 bg-brand-gold hover:bg-yellow-500 text-white font-semibold rounded-full transition-all shadow-lg hover:shadow-brand-gold/30 hover:scale-[1.02]"
                    >
                        Check Availability & Book
                    </Link>
                </div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxIndex !== null && currentImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                        onClick={closeLightbox}
                    >
                        {/* Close button */}
                        <button
                            onClick={closeLightbox}
                            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Counter */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm z-10">
                            {lightboxIndex + 1} / {filtered.length}
                        </div>

                        {/* Prev button */}
                        <button
                            onClick={e => { e.stopPropagation(); goPrev(); }}
                            className="absolute left-2 sm:left-6 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition z-10"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>

                        {/* Image */}
                        <motion.div
                            key={lightboxIndex}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                            className="max-w-5xl max-h-[85vh] w-full px-16 sm:px-24"
                            onClick={e => e.stopPropagation()}
                        >
                            <Image
                                src={currentImage.src}
                                alt={currentImage.alt}
                                width={1600}
                                height={1200}
                                sizes="100vw"
                                quality={85}
                                className="w-full h-full object-contain rounded-lg"
                                style={{ maxHeight: "85vh", width: "100%", height: "auto" }}
                            />
                            <p className="text-white/60 text-sm text-center mt-4">{currentImage.alt}</p>
                        </motion.div>

                        {/* Next button */}
                        <button
                            onClick={e => { e.stopPropagation(); goNext(); }}
                            className="absolute right-2 sm:right-6 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition z-10"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
