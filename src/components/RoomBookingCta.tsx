"use client";

import { useState } from "react";
import { ToastProvider } from "@/components/ui/toast-context";
import { BookingModal } from "@/components/BookingModal";

/**
 * Booking button for the room pages.
 *
 * The room pages are server components, but BookingModal is a client component
 * that needs a ToastProvider above it (useToast throws without one). This wraps
 * both so a room page can drop in a working "check availability" button.
 */
export function RoomBookingCta({ label = "Check availability" }: { label?: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <ToastProvider>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center justify-center bg-brand-gold text-slate-900 font-bold py-4 px-8 rounded-full text-base hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-lg"
            >
                {label}
            </button>
            <BookingModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </ToastProvider>
    );
}
