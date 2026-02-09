"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

const images = [
    { src: "/Exterior.avif", alt: "Whistle Inn Victorian Farmhouse Exterior" },
    { src: "/pool.webp", alt: "Whistle Inn Pool Area" },
    { src: "/kids snow tube.jpg", alt: "Kids snow tubing in Sierra Nevada" },
    { src: "/flyfish.jpg", alt: "Family fly fishing on American River" },
    { src: "/LivingRoom.webp", alt: "Whistle Inn Living Room" },
    { src: "/fishing.jpg", alt: "Gold panning in Sierra foothills" },
    { src: "/hiking.jpg", alt: "Family hiking in Sierra foothills" },
    { src: "/snowman.jpg", alt: "Family playing in snow" },
    { src: "/DiningArea.webp", alt: "Whistle Inn Dining Area" },
];

export const HeroImageSlider = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, 8000); // Change image every 8 seconds
        return () => clearInterval(interval);
    }, []);

    const currentImage = images[currentIndex];

    return (
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
    );
};
