"use client";

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EditableImage } from './content/EditableImage';

interface ImageConfig {
    key: string;
    defaultSrc: string;
    alt: string;
}

interface HeroImageSliderProps {
    images?: Array<{ src: string; alt: string }>; // Fallback
    imageConfig?: ImageConfig[];
}

export const HeroImageSlider = ({ images, imageConfig }: HeroImageSliderProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const length = imageConfig ? imageConfig.length : (images?.length || 0);

    useEffect(() => {
        if (length === 0) return;
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % length);
        }, 8000); // Change image every 8 seconds
        return () => clearInterval(interval);
    }, [length]);

    if (!images && !imageConfig) return null;

    return (
        <div className="absolute inset-0 z-0">
            <AnimatePresence initial={false}>
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2 }}
                    className="absolute inset-0"
                >
                    {imageConfig ? (
                        <EditableImage
                            contentKey={imageConfig[currentIndex].key}
                            defaultValue={imageConfig[currentIndex].defaultSrc}
                            alt={imageConfig[currentIndex].alt}
                            fill
                            className="object-cover"
                            priority={currentIndex === 0}
                            style={{
                                objectPosition: 'center',
                                transform: 'scale(1.1)',
                            }}
                        />
                    ) : (
                        // Fallback 
                        <img
                            src={images![currentIndex].src}
                            alt={images![currentIndex].alt}
                            className="w-full h-full object-cover"
                        />
                    )}
                </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-50/10" />

            {/* Ken Burns effect was here but difficult to apply to the editable Next/Image wrapper consistently without complex DOM manipulation, simplifying for Edit Mode stability */}
        </div>
    );
};
