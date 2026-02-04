"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { loadStripe } from "@stripe/stripe-js";
import { X, Calendar, Loader2 } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import clsx from "clsx";

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

const PRICE_PER_NIGHT = 450;
const CLEANING_FEE = 150;

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BookingModal({ isOpen, onClose }: BookingModalProps) {
    const [range, setRange] = useState<DateRange | undefined>();
    const [loading, setLoading] = useState(false);
    const [bookedDates, setBookedDates] = useState<Date[]>([]);

    // Fetch availability on mount (mocked for now)
    useEffect(() => {
        // fetch('/api/availability').then(res => res.json()).then(dates => setBookedDates(dates.map(d => new Date(d))));
    }, []);

    const handleCheckout = async () => {
        if (!range?.from || !range?.to) return;
        setLoading(true);

        try {
            const response = await fetch('/api/checkout_sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: range.from,
                    endDate: range.to,
                }),
            });

            const { sessionId, error } = await response.json();
            if (error) throw new Error(error);

            const stripe = await stripePromise;
            if (stripe) {
                const { error: stripeError } = await (stripe as any).redirectToCheckout({ sessionId });
                if (stripeError) console.error(stripeError);
            }
        } catch (err) {
            console.error(err);
            alert("Checkout failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const numNights = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : 0;
    const total = numNights * PRICE_PER_NIGHT + CLEANING_FEE;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white pointer-events-auto rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h2 className="font-serif text-2xl font-bold text-slate-800">Book Your Stay</h2>
                                    <p className="text-sm text-slate-500">Select dates for your getaway</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <div className="flex justify-center mb-6">
                                    <DayPicker
                                        mode="range"
                                        selected={range}
                                        onSelect={setRange}
                                        disabled={{ before: new Date() }}
                                        modifiers={{ booked: bookedDates }}
                                        modifiersStyles={{ booked: { color: 'gray', textDecoration: 'line-through' } }}
                                        className="border rounded-xl p-4 shadow-sm bg-white"
                                    />
                                </div>

                                {range?.from && range?.to && numNights > 0 && (
                                    <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                        <div className="flex justify-between text-slate-600">
                                            <span>${PRICE_PER_NIGHT} x {numNights} nights</span>
                                            <span>${numNights * PRICE_PER_NIGHT}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Cleaning Fee</span>
                                            <span>${CLEANING_FEE}</span>
                                        </div>
                                        <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-slate-900 text-lg">
                                            <span>Total</span>
                                            <span>${total}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={handleCheckout}
                                    disabled={!range?.from || !range?.to || loading}
                                    className="w-full py-4 bg-brand-gold text-white font-bold rounded-xl shadow-lg hover:bg-yellow-500 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        `Reserve for $${range?.from && range?.to ? total : '...'}`
                                    )}
                                </button>
                                <p className="text-center text-xs text-gray-400 mt-3">
                                    You strictly won't be charged yet. This is a demo.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
