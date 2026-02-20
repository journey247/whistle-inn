"use client";

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type HeroImage = {
    src: string;
    alt: string;
    attribution?: string;
};

export const images: HeroImage[] = [
    { src: "/Exterior.avif", alt: "Whistle Inn Victorian Farmhouse Exterior" },
    { src: "/1650", alt: "Whistle Inn Train View", attribution: "Photo By: Annette Rogers Purther" },
    { src: "/pool.webp", alt: "Whistle Inn Pool Area" },
    { src: "/LivingRoom.webp", alt: "Whistle Inn Living Room" },
    { src: "/DiningArea.webp", alt: "Whistle Inn Dining Area" },
    { src: "/balcony.webp", alt: "Whistle Inn Balcony View" },
    { src: "/entry.jpg", alt: "Whistle Inn Grand Entrance" },
    { src: "/patio.webp", alt: "Whistle Inn Patio" },
    { src: "/fullkitchen.avif", alt: "Whistle Inn Kitchen" },
    { src: "/Bedroom1.webp", alt: "Whistle Inn Primary Bedroom" },
];

// Custom hook to share slider state
export const useHeroSlider = (images: HeroImage[]) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [images.length]);

    return { currentIndex, currentImage: images[currentIndex] };
};

// Subtle Ken Burns variants — alternate direction each slide so motion feels
// organic rather than always drifting the same way.
// Rules: max translate is ±1.5% (barely perceptible on large screens),
// scale range is 1.00 → 1.05 (5% zoom max, was 10%).
const KB_VARIANTS = [
    'kenburns-tl', // top-left drift
    'kenburns-tr', // top-right drift
    'kenburns-bl', // bottom-left drift
    'kenburns-br', // bottom-right drift
] as const;

export const HeroImageSlider = ({ images }: { images: HeroImage[] }) => {
    const { currentIndex, currentImage } = useHeroSlider(images);

    // Pick a different Ken Burns direction for each slide index
    const kbClass = KB_VARIANTS[currentIndex % KB_VARIANTS.length];

    return (
        <>
            <div className="absolute inset-0 z-0">
                <AnimatePresence initial={false}>
                    <motion.div
                        key={currentImage.src}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0"
                    >
                        <img
                            src={currentImage.src}
                            alt={currentImage.alt}
                            className={`object-cover w-full h-full hero-kb ${kbClass}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                        />
                    </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-50/10" />

                <style jsx global>{`
                    /* Shared: subtle 5% zoom over 12 s, no pan by default */
                    .hero-kb {
                        animation-duration: 12s;
                        animation-timing-function: ease-in-out;
                        animation-fill-mode: forwards;
                        will-change: transform;
                    }

                    /* Each variant pans ≤1.5% in its own corner direction */
                    .kenburns-tl { animation-name: kb-tl; }
                    .kenburns-tr { animation-name: kb-tr; }
                    .kenburns-bl { animation-name: kb-bl; }
                    .kenburns-br { animation-name: kb-br; }

                    @keyframes kb-tl {
                        from { transform: scale(1.05) translate( 1.0%,  1.0%); }
                        to   { transform: scale(1.00) translate( 0.0%,  0.0%); }
                    }
                    @keyframes kb-tr {
                        from { transform: scale(1.05) translate(-1.0%,  1.0%); }
                        to   { transform: scale(1.00) translate( 0.0%,  0.0%); }
                    }
                    @keyframes kb-bl {
                        from { transform: scale(1.05) translate( 1.0%, -1.0%); }
                        to   { transform: scale(1.00) translate( 0.0%,  0.0%); }
                    }
                    @keyframes kb-br {
                        from { transform: scale(1.05) translate(-1.0%, -1.0%); }
                        to   { transform: scale(1.00) translate( 0.0%,  0.0%); }
                    }
                `}</style>
            </div>
        </>
    );
};
