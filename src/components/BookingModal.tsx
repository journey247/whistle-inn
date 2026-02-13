"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { loadStripe } from "@stripe/stripe-js";
import { X, Calendar, Loader2, Users, Info, Tag } from "lucide-react";
import { format } from "date-fns";

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

interface Quote {
    total: number;
    accommodationTotal: number;
    cleaningFee: number;
    discountAmount: number;
    nights: number;
    error?: string;
    currency: string;
}

export function BookingModal({ isOpen, onClose, title = "Book Your Stay" }: BookingModalProps) {
    const [range, setRange] = useState<DateRange | undefined>();
    const [loading, setLoading] = useState(false);
    const [bookedDates, setBookedDates] = useState<Date[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(true);
    const [guestCount, setGuestCount] = useState(2);
    const MAX_GUESTS = 10;
    const MINIMUM_NIGHTS = 3; // Should match server validation

    // Pricing State
    const [quote, setQuote] = useState<Quote | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [couponError, setCouponError] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState("");

    // Fetch availability on mount and when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchAvailability();
        }
    }, [isOpen]);

    // Update quote when dates change (resetting coupon)
    useEffect(() => {
        if (range?.from && range?.to) {
            setAppliedCoupon(""); // Reset coupon on date change
            setCouponCode(""); 
            fetchQuote();
        } else {
            setQuote(null);
        }
    }, [range?.from, range?.to]);

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

    const fetchQuote = async (codeToApply?: string) => {
        if (!range?.from || !range?.to) return;
        
        setQuoteLoading(true);
        setCouponError("");

        try {
            const response = await fetch('/api/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: range.from,
                    endDate: range.to,
                    couponCode: codeToApply
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (codeToApply) {
                    setCouponError(data.error || "Invalid coupon");
                    // Refetch without coupon to restore base price
                    if (data.error === "Invalid or expired coupon") {
                        fetchQuote(undefined);
                        return;
                    }
                }
                setQuote({ ...data, error: data.error });
            } else {
                setQuote(data);
                if (codeToApply) {
                    setAppliedCoupon(codeToApply);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setQuoteLoading(false);
        }
    };

    const handleApplyCoupon = () => {
        if (!couponCode.trim()) return;
        fetchQuote(couponCode.trim());
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
                    guestCount,
                    couponCode: appliedCoupon || undefined,
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

            // Handle Mock URL (or explicit redirect URL)
            if (data.url) {
                window.location.href = data.url;
                return;
            }

            const { sessionId } = data;
            const stripe = await stripePromise;
            if (stripe) {
                const { error: stripeError } = await (stripe as any).redirectToCheckout({ sessionId });
                if (stripeError) console.error(stripeError);
            }
        } catch (err: any) {
            console.error(err);
            alert(`Checkout failed: ${err.message}`);
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
    const numNights = quote?.nights || 0;
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
                    >
                        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl lg:max-w-6xl max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-white backdrop-blur sticky top-0 z-10 rounded-t-2xl sm:rounded-t-3xl shadow-sm shrink-0">
                                <div>
                                    <h2 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-slate-900">{title}</h2>
                                    <p className="text-xs sm:text-sm text-slate-600 font-medium">Select dates and guests</p>
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
                                    <div className="flex items-center justify-center p-12 sm:p-20">
                                        <div className="text-center">
                                            <Loader2 className="w-10 h-10 animate-spin text-brand-gold mx-auto mb-4" />
                                            <p className="text-slate-600 font-medium">Checking availability...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="md:grid md:grid-cols-7 lg:grid-cols-5">
                                        {/* Left Side: Calendar & Guests */}
                                        <div className="md:col-span-4 lg:col-span-3 p-4 sm:p-5 border-b md:border-b-0 md:border-r border-gray-100">
                                            <div className="mb-4 sm:mb-6">
                                                <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 sm:mb-4 flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" /> Select Dates
                                                </h3>

                                                <div className="flex justify-center bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
                                                    <style jsx>{`
                                                        .rdp {
                                                            --rdp-cell-size: 38px;
                                                            --rdp-accent-color: #DAA520;
                                                            --rdp-background-color: #DAA520;
                                                            margin: 0;
                                                        }
                                                        @media (min-width: 640px) {
                                                            .rdp { --rdp-cell-size: 44px; }
                                                        }
                                                        @media (min-width: 1024px) {
                                                            .rdp { --rdp-cell-size: 46px; }
                                                        }
                                                        .rdp-button:hover:not([disabled]) {
                                                            background-color: #FFF8E1;
                                                        }
                                                        .rdp-day_selected {
                                                            background-color: #DAA520 !important;
                                                            color: white !important;
                                                            font-weight: bold;
                                                        }
                                                        .rdp-day_disabled {
                                                            color: #cbd5e1 !important;
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
                                                                color: '#94a3b8',
                                                                textDecoration: 'line-through',
                                                                opacity: 0.5
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                {/* Legend */}
                                                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 px-2">
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                                        <span>Unavailable</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-brand-gold"></div>
                                                        <span>Selected</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-2">
                                                <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 sm:mb-4 flex items-center gap-2">
                                                    <Users className="w-4 h-4" /> Guests
                                                </h3>
                                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                    <div>
                                                        <span className="block font-medium text-slate-900">Total Guests</span>
                                                        <span className="text-xs text-slate-500">Including children</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                                                            className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-slate-600 font-bold"
                                                            disabled={guestCount <= 1}
                                                        >-</button>
                                                        <span className="font-serif text-xl w-6 text-center">{guestCount}</span>
                                                        <button
                                                            onClick={() => setGuestCount(Math.min(MAX_GUESTS, guestCount + 1))}
                                                            className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-slate-600 font-bold"
                                                            disabled={guestCount >= MAX_GUESTS}
                                                        >+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Summary & Action */}
                                        <div className="md:col-span-3 lg:col-span-2 bg-slate-50/50 p-4 sm:p-5 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-serif font-bold text-base sm:text-lg md:text-xl mb-4 sm:mb-6 text-slate-900 border-b pb-2">Reservation Summary</h3>

                                                {range?.from && range?.to && quote ? (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                                        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                                                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                                <span className="text-slate-500 block text-xs mb-1 font-medium">Check-in</span>
                                                                <span className="font-bold text-slate-900 text-base">{format(range.from, 'MMM dd')}</span>
                                                            </div>
                                                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                                <span className="text-slate-500 block text-xs mb-1 font-medium">Check-out</span>
                                                                <span className="font-bold text-slate-900 text-base">{format(range.to, 'MMM dd')}</span>
                                                            </div>
                                                        </div>

                                                        {/* Price Breakdown */}
                                                        <div className="space-y-3 text-sm">
                                                            {quoteLoading ? (
                                                                <div className="py-4 flex justify-center text-slate-500">
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="flex justify-between items-center text-slate-700">
                                                                        <span className="font-medium">Accommodation ({quote.nights} nights)</span>
                                                                        <span className="font-semibold">${quote.accommodationTotal.toLocaleString()}</span>
                                                                    </div>
                                                                    
                                                                    <div className="flex justify-between items-start text-slate-700">
                                                                        <span className="flex items-center gap-1 font-medium">Cleaning Fee <Info className="w-3 h-3 text-slate-400" /></span>
                                                                        <span className="font-semibold">${quote.cleaningFee}</span>
                                                                    </div>
                                                                    
                                                                    {quote.discountAmount > 0 && (
                                                                        <div className="flex justify-between items-center text-green-700 bg-green-50 p-2 rounded">
                                                                            <span className="font-medium flex items-center gap-1"><Tag className="w-3 h-3"/> Discount ({appliedCoupon})</span>
                                                                            <span className="font-semibold">-${quote.discountAmount.toLocaleString()}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Coupon Input */}
                                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                                            <label className="text-xs font-semibold uppercase text-slate-500 block mb-2">Promo Code</label>
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={couponCode}
                                                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                                    placeholder="Enter code"
                                                                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 uppercase focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                                                                />
                                                                <button 
                                                                    onClick={handleApplyCoupon}
                                                                    disabled={!couponCode || quoteLoading}
                                                                    className="bg-slate-800 text-white text-xs font-bold px-4 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                                                                >
                                                                    Apply
                                                                </button>
                                                            </div>
                                                            {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                                                        </div>

                                                        <div className="border-t border-slate-300 mt-4 pt-4">
                                                            <div className="flex justify-between items-end">
                                                                <span className="font-serif font-bold text-xl text-slate-900">Total</span>
                                                                <div className="text-right">
                                                                    <span className="block font-bold text-2xl text-brand-gold">${quote.total.toLocaleString()}</span>
                                                                    <span className="text-xs text-slate-600 block font-medium">Includes taxes & fees</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-10 opacity-60">
                                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                                                            <Calendar className="w-8 h-8 text-slate-300" />
                                                        </div>
                                                        <p className="text-slate-500 text-sm">Select check-in and check-out dates to see the price breakdown.</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="mt-6 space-y-3">
                                                {range?.from && range?.to && numNights > 0 && !meetsMinimum && (
                                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 animate-pulse">
                                                        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                                        <p className="text-xs sm:text-sm text-amber-800 font-medium">
                                                            Minimum {MINIMUM_NIGHTS} nights required for this stay.
                                                        </p>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={handleCheckout}
                                                    disabled={loading || !range?.from || !range?.to || !meetsMinimum || hasDateConflict || !!quote?.error}
                                                    className="w-full bg-brand-gold hover:bg-yellow-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-bold text-base transition-all transform active:scale-95 shadow-lg shadow-brand-gold/30 hover:shadow-xl hover:shadow-brand-gold/40 flex items-center justify-center gap-2"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Reserve with Stripe
                                                        </>
                                                    )}
                                                </button>

                                                {!range?.from && (
                                                    <p className="text-center text-xs text-slate-500 font-medium">
                                                        Cards won't be charged until booking is confirmed
                                                    </p>
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