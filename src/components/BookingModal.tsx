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
                        transition={{ type: "spring", duration: 0.5 }}
                        className="fixed inset-2 sm:inset-4 md:left-1/2 md:top-1/2 md:h-fit md:max-h-[90vh] md:w-full md:max-w-4xl md:-translate-x-1/2 md:-translate-y-1/2 z-50 flex items-center justify-center"
                    >
                        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-lg md:max-w-4xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                            {/* Mobile-optimized header */}
                            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                                <div>
                                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-800">Book Your Stay</h2>
                                    <p className="text-sm text-slate-500">Select dates for your getaway</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors active:scale-95 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    aria-label="Close booking modal"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {loadingAvailability ? (
                                    <div className="flex items-center justify-center p-8 sm:p-12">
                                        <div className="text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-brand-gold mx-auto mb-4" />
                                            <p className="text-slate-600">Loading availability...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="md:grid md:grid-cols-3 md:gap-6 h-full">
                                        {/* Calendar Section - Mobile First */}
                                        <div className="md:col-span-2 p-4 sm:p-6">
                                            <style jsx>{`
                                                .rdp {
                                                    --rdp-cell-size: 36px;
                                                    --rdp-accent-color: #DAA520;
                                                    --rdp-background-color: #DAA520;
                                                    margin: 0;
                                                }
                                                @media (min-width: 640px) {
                                                    .rdp {
                                                        --rdp-cell-size: 40px;
                                                    }
                                                }
                                                .rdp-button:hover:not([disabled]) {
                                                    background-color: #f3f4f6;
                                                }
                                                .rdp-button:focus-visible {
                                                    outline: 2px solid #DAA520;
                                                    outline-offset: 2px;
                                                }
                                                .rdp-months {
                                                    justify-content: center;
                                                }
                                            `}</style>
                                            <DayPicker
                                                mode="range"
                                                selected={range}
                                                onSelect={setRange}
                                                disabled={[
                                                    { before: new Date() },
                                                    ...bookedDates
                                                ]}
                                                numberOfMonths={1}
                                                modifiers={{ booked: bookedDates }}
                                                modifiersStyles={{
                                                    booked: {
                                                        color: 'white',
                                                        backgroundColor: '#ef4444',
                                                        textDecoration: 'line-through'
                                                    }
                                                }}
                                                className="w-full"
                                            />

                                            {bookedDates.length > 0 && (
                                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-sm text-red-700">
                                                        <span className="font-medium">Note:</span> Red dates are already booked.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Booking Summary - Mobile responsive */}
                                        <div className="md:col-span-1 bg-slate-50 border-t md:border-t-0 md:border-l border-gray-200">
                                            <div className="p-4 sm:p-6 sticky top-0">
                                                <h3 className="font-serif font-bold text-lg mb-4 text-slate-900">Summary</h3>

                                                {range?.from && range?.to ? (
                                                    <div className="space-y-3 mb-6">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600">Check-in</span>
                                                            <span className="font-medium">{format(range.from, 'MMM dd')}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600">Check-out</span>
                                                            <span className="font-medium">{format(range.to, 'MMM dd')}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600">Nights</span>
                                                            <span className="font-medium">{numNights}</span>
                                                        </div>
                                                        {numNights > 0 && (
                                                            <>
                                                                <hr className="my-3" />
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-slate-600">Accommodation</span>
                                                                        <span>${accommodationTotal.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-slate-600">Cleaning fee</span>
                                                                        <span>${CLEANING_FEE}</span>
                                                                    </div>
                                                                </div>
                                                                <hr className="my-3" />
                                                                <div className="flex justify-between font-bold">
                                                                    <span>Total</span>
                                                                    <span className="text-brand-gold">${total.toLocaleString()}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-6">
                                                        <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                        <p className="text-slate-500 text-sm">Select dates to see pricing</p>
                                                    </div>
                                                )}

                                                {/* Mobile-optimized booking actions */}
                                                {range?.from && range?.to && numNights > 0 && (
                                                    <div className="space-y-3">
                                                        {!meetsMinimum && (
                                                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                                <p className="text-xs sm:text-sm text-amber-800 font-medium">
                                                                    Minimum {MINIMUM_NIGHTS} nights required
                                                                </p>
                                                            </div>
                                                        )}
                                                        {hasDateConflict && (
                                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                                <p className="text-xs sm:text-sm text-red-800 font-medium">
                                                                    Selected dates are unavailable
                                                                </p>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={handleCheckout}
                                                            disabled={loading || !meetsMinimum || hasDateConflict}
                                                            className="w-full bg-brand-gold hover:bg-yellow-500 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-xl transition-all active:scale-95 touch-manipulation min-h-[48px] flex items-center justify-center gap-2"
                                                        >
                                                            {loading ? (
                                                                <>
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                    <span>Processing...</span>
                                                                </>
                                                            ) : (
                                                                `Book Now - $${total.toLocaleString()}`
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}