"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { loadStripe } from "@stripe/stripe-js";
import { X, Calendar, Loader2 } from "lucide-react";
import { format, differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import clsx from "clsx";

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

const WEEKDAY_PRICE = 650; // Mon-Thu
const WEEKEND_PRICE = 700; // Fri-Sun
const CLEANING_FEE = 150;
const MINIMUM_NIGHTS = 3;

// Calculate total price based on day of week
const calculateTotalPrice = (startDate: Date, endDate: Date): number => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    // Exclude the last day (checkout day)
    const nightDays = days.slice(0, -1);

    let total = 0;
    nightDays.forEach(day => {
        const dayOfWeek = day.getDay();
        // Friday (5), Saturday (6), Sunday (0) = weekend pricing
        if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
            total += WEEKEND_PRICE;
        } else {
            total += WEEKDAY_PRICE;
        }
    });

    return total;
};

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BookingModal({ isOpen, onClose }: BookingModalProps) {
    const [range, setRange] = useState<DateRange | undefined>();
    const [loading, setLoading] = useState(false);
    const [bookedDates, setBookedDates] = useState<Date[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(true);

    // Fetch availability on mount and when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchAvailability();
        }
    }, [isOpen]);

    const fetchAvailability = async () => {
        try {
            setLoadingAvailability(true);
            const response = await fetch('/api/availability');
            const bookings = await response.json();

            // Convert booking ranges to individual blocked dates
            const blockedDates: Date[] = [];
            bookings.forEach((booking: any) => {
                const start = new Date(booking.startDate);
                const end = new Date(booking.endDate);
                const current = new Date(start);

                // Add all dates in the range (including start, excluding end for checkout)
                while (current < end) {
                    blockedDates.push(new Date(current));
                    current.setDate(current.getDate() + 1);
                }
            });

            setBookedDates(blockedDates);
        } catch (error) {
            console.error('Failed to fetch availability:', error);
        } finally {
            setLoadingAvailability(false);
        }
    };

    const handleCheckout = async () => {
        if (!range?.from || !range?.to) return;

        // Check for conflicts on frontend first
        const hasConflict = checkDateConflict(range.from, range.to);
        if (hasConflict) {
            alert("These dates are already booked. Please select different dates.");
            return;
        }

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

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    // Dates are booked - refresh availability and show error
                    await fetchAvailability();
                    alert("These dates are already booked. The calendar has been updated.");
                    return;
                }
                throw new Error(data.error || 'Checkout failed');
            }

            const { sessionId } = data;
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

    const checkDateConflict = (start: Date, end: Date): boolean => {
        return bookedDates.some(bookedDate => {
            return bookedDate >= start && bookedDate < end;
        });
    };

    const hasDateConflict = range?.from && range?.to ? checkDateConflict(range.from, range.to) : false;
    const numNights = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : 0;
    const accommodationTotal = range?.from && range?.to && numNights > 0 ? calculateTotalPrice(range.from, range.to) : 0;
    const total = accommodationTotal + CLEANING_FEE;
    const meetsMinimum = numNights >= MINIMUM_NIGHTS;

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
                                    {loadingAvailability ? (
                                        <div className="flex items-center justify-center p-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                            <span className="ml-2 text-gray-500">Loading availability...</span>
                                        </div>
                                    ) : (
                                        <DayPicker
                                            mode="range"
                                            selected={range}
                                            onSelect={setRange}
                                            disabled={[
                                                { before: new Date() },
                                                ...bookedDates
                                            ]}
                                            modifiers={{ booked: bookedDates }}
                                            modifiersStyles={{
                                                booked: {
                                                    color: 'white',
                                                    backgroundColor: '#ef4444',
                                                    textDecoration: 'line-through'
                                                }
                                            }}
                                            className="border rounded-xl p-4 shadow-sm bg-white"
                                        />
                                    )}
                                </div>

                                {bookedDates.length > 0 && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-700">
                                            <span className="font-medium">Note:</span> Red dates are already booked and cannot be selected.
                                        </p>
                                    </div>
                                )}

                                {range?.from && range?.to && numNights > 0 && (
                                    <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                        {!meetsMinimum && (
                                            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                <p className="text-sm text-amber-800 font-medium">
                                                    Minimum {MINIMUM_NIGHTS} night stay required
                                                </p>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-slate-600">
                                            <span>{numNights} nights</span>
                                            <span>${accommodationTotal}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            $650/night Mon-Thu, $700/night Fri-Sun
                                        </p>
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
                                    disabled={!range?.from || !range?.to || loading || hasDateConflict || loadingAvailability || !meetsMinimum}
                                    className="w-full py-4 bg-brand-gold text-white font-bold rounded-xl shadow-lg hover:bg-yellow-500 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : hasDateConflict ? (
                                        "Dates Unavailable"
                                    ) : !meetsMinimum && numNights > 0 ? (
                                        `Minimum ${MINIMUM_NIGHTS} Nights Required`
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
