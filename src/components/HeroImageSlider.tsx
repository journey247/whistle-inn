"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

type HeroImage = {
    src: string;
    alt: string;
    attribution?: string;
};

export const images: HeroImage[] = [
    { src: "/Exterior.avif", alt: "Whistle Inn Victorian Farmhouse Exterior" },
    { src: "/1650.webp", alt: "Whistle Inn Train View", attribution: "Photo By: Annette Rogers Purther" },
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

export const HeroImageSlider = ({ images }: { images: HeroImage[] }) => {
    const { currentIndex, currentImage } = useHeroSlider(images);

    return (
        <>
            <div className="absolute inset-0 z-0">
                <AnimatePresence initial={false}>
                    <motion.div
                        key={currentImage.src}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 2 }}
                        className="absolute inset-0"
                    >
                        <Image
                            src={currentImage.src}
                            alt={currentImage.alt}
                            fill
                            className="object-cover"
                            priority={currentIndex === 0} // Only prioritize the first image
                            style={{
                                objectPosition: 'center',
                                transform: 'scale(1.1)', // Ken Burns effect: initial zoom
                                animation: 'kenburns 10s forwards infinite' // Apply animation
                            }}
                        />
                    </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-50/10" />

                {/* Ken Burns effect CSS in a style tag for simplicity.
                    In a real app, this might be in a global CSS file or a styled-component. */}
                <style jsx global>{`
                    @keyframes kenburns {
                        0% {
                            transform: scale(1.1) translateX(0%);
                            object-position: center;
                        }
                        50% {
                            transform: scale(1) translateX(5%);
                            object-position: top right;
                        }
                        100% {
                            transform: scale(1.1) translateX(0%);
                            object-position: center;
                        }
                    }
                `}</style>
            </div>
        </>
    );
};
