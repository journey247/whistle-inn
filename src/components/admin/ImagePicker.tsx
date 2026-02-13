"use client";

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import Image from 'next/image';

interface ImagePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

const SAMPLE_IMAGES = [
    "/Exterior.avif",
    "/pool.webp",
    "/LivingRoom.webp",
    "/DiningArea.webp",
    "/Bedroom2.avif",
    "/Bedroom3.avif",
    "/fullkitchen.avif",
    "/halfbath.avif",
    "/1650/IMG_1650.jpg",
    "/1650/IMG_1663.jpg",  // Assuming these exist or will exist
    "/1650/IMG_1673.jpg",
];

export function ImagePicker({ isOpen, onClose, onSelect }: ImagePickerProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Select Image</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {SAMPLE_IMAGES.map((src, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelect(src)}
                            className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-brand-gold hover:ring-2 hover:ring-brand-gold transition-all"
                        >
                            <Image
                                src={src}
                                alt="Asset"
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
