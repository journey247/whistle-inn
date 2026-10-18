"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { loadStripe } from "@stripe/stripe-js";
import { X, Calendar, Loader2, Users, Info, Tag, User, Home, BedDouble, Phone, Wrench } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast-context";

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    /**
     * Preselect a single room (used by the room pages). The guest can still
     * switch to another room or to the whole house from inside the modal.
     */
    roomSlug?: string | null;
}

interface BookableRoom {
    slug: string;
    name: string;
    beds: string;
    weekdayPrice: number;
    weekendPrice: number;
    maxGuests: number;
}

interface Quote {
    total: number;
    roomName: string | null;
    accommodationTotal: number;
    cleaningFee: number;
    discountAmount: number;
    nights: number;
    error?: string;
    currency: string;
    tax?: {
        totRate: number;
        totAmount: number;
        assessmentRate: number;
        assessmentLabel: string;
        assessmentAmount: number;
        totalTax: number;
        exempt: boolean;
    };
}

/** Whole dollars stay whole ($1,950); tax brings in cents ($2,106.00). */
function money(n: number): string {
    return Number.isInteger(n)
        ? n.toLocaleString('en-US')
        : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BookingModal({ isOpen, onClose, title = "Book Your Stay", roomSlug = null }: BookingModalProps) {
    const { addToast } = useToast();
    const [range, setRange] = useState<DateRange | undefined>();
    const [loading, setLoading] = useState(false);
    const [bookedDates, setBookedDates] = useState<Date[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(true);
    const [guestCount, setGuestCount] = useState(2);
    const [guestName, setGuestName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [guestInfoError, setGuestInfoError] = useState("");
    // Booking constraints come from /api/settings/public; these are only the
    // fallbacks used before that request resolves (or if it fails).
    const [maxGuests, setMaxGuests] = useState(14);
    const [minimumNights, setMinimumNights] = useState(3);
    const [roomMinimumNights, setRoomMinimumNights] = useState(2);
    // Online payment can be paused by the owner. While it is, the guest's
    // details are saved as a request and they are asked to call instead.
    // Starts paused to match the server, which treats a missing setting as off.
    const [onlineCheckoutEnabled, setOnlineCheckoutEnabled] = useState(false);
    const [contact, setContact] = useState({ name: "Nora", phone: "(530) 448-6242" });
    const [requestSent, setRequestSent] = useState(false);

    // Which product the guest is buying: a room slug, or null for the whole house.
    const [selectedRoom, setSelectedRoom] = useState<string | null>(roomSlug);
    const [rooms, setRooms] = useState<BookableRoom[]>([]);

    // The selected room's own record, or null when booking the whole house.
    const activeRoom = selectedRoom ? rooms.find(r => r.slug === selectedRoom) ?? null : null;
    // A room sleeps far fewer people than the property's 14 — cap by the room
    // when one is selected, otherwise by the property-wide limit.
    const effectiveMaxGuests = activeRoom ? activeRoom.maxGuests : maxGuests;

    // Pricing State
    const [quote, setQuote] = useState<Quote | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [couponError, setCouponError] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState("");

    // Fetch settings and the room list when the modal opens
    useEffect(() => {
        if (isOpen) {
            setRequestSent(false);
            fetchBookingSettings();
            fetchRooms();
        }
    }, [isOpen]);

    // Reopening from a room page should land on that room, not on whatever
    // the guest happened to pick the last time the modal was open.
    useEffect(() => {
        if (isOpen) setSelectedRoom(roomSlug);
    }, [isOpen, roomSlug]);

    // Availability is per room: the whole house needs every room free, while a
    // single room only cares about its own bookings and any whole-house one.
    useEffect(() => {
        if (isOpen) fetchAvailability();
    }, [isOpen, selectedRoom]);

    // Switching to a smaller room must not leave a party of eight selected.
    useEffect(() => {
        setGuestCount(current => Math.min(current, effectiveMaxGuests));
    }, [effectiveMaxGuests]);

    // Update quote when dates or the selected room change (resetting coupon)
    useEffect(() => {
        if (range?.from && range?.to) {
            setAppliedCoupon(""); // Reset coupon on date change
            setCouponCode("");
            fetchQuote();
        } else {
            setQuote(null);
        }
    }, [range?.from, range?.to, selectedRoom]);

    const fetchAvailability = async () => {
        try {
            setLoadingAvailability(true);
            const url = selectedRoom
                ? `/api/availability?room=${encodeURIComponent(selectedRoom)}`
                : '/api/availability';
            const response = await fetch(url);
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

    // Previously this hit /api/admin/content, which requires an admin token, so
    // guests always 401'd and silently fell back to a hardcoded 3-night minimum.
    const fetchBookingSettings = async () => {
        try {
            const response = await fetch('/api/settings/public');
            if (response.ok) {
                const settings = await response.json();
                if (settings.minimumNights) setMinimumNights(settings.minimumNights);
                if (settings.maxGuests) setMaxGuests(settings.maxGuests);
                if (settings.roomMinimumNights) setRoomMinimumNights(settings.roomMinimumNights);
                setOnlineCheckoutEnabled(settings.onlineCheckoutEnabled === true);
                if (settings.contactPhone) {
                    setContact({ name: settings.contactName || "Nora", phone: settings.contactPhone });
                }
            }
        } catch (error) {
            console.error('Failed to fetch booking settings:', error);
            // Keep defaults
        }
    };

    const fetchRooms = async () => {
        try {
            const response = await fetch('/api/rooms');
            if (response.ok) setRooms(await response.json());
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
            // Non-fatal: the modal falls back to whole-house booking only.
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
                    couponCode: codeToApply,
                    roomSlug: selectedRoom,
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
            addToast("Those dates are already booked — please pick different dates.", "error");
            return;
        }

        // Validate guest info
        const trimmedName = guestName.trim();
        const trimmedEmail = guestEmail.trim().toLowerCase();

        if (!trimmedName) {
            setGuestInfoError("Please enter your full name.");
            return;
        }
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setGuestInfoError("Please enter a valid email address.");
            return;
        }

        setGuestInfoError("");
        setLoading(true);

        try {
            const response = await fetch('/api/checkout_sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: range.from,
                    endDate: range.to,
                    guestCount,
                    guestName: trimmedName,
                    guestEmail: trimmedEmail,
                    couponCode: appliedCoupon || undefined,
                    roomSlug: selectedRoom,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    // Dates are booked - refresh availability and show error
                    await fetchAvailability();
                    addToast("Someone just booked those dates. The calendar has been updated — please choose again.", "error");
                    return;
                }
                throw new Error(data.error || 'Checkout failed');
            }

            // Checkout is paused: the request was saved for the owner to
            // approve, and the guest is shown who to call.
            if (data.requested) {
                if (data.contactPhone) {
                    setContact({ name: data.contactName || "Nora", phone: data.contactPhone });
                }
                setRequestSent(true);
                return;
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
            addToast(err?.message || "Something went wrong starting checkout. Please try again.", "error");
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
    // A single room has its own capacity and its own, shorter minimum stay.
    const effectiveMinimumNights = selectedRoom ? roomMinimumNights : minimumNights;
    const meetsMinimum = numNights >= effectiveMinimumNights;

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
                                {requestSent ? (
                                    <div className="flex items-center justify-center p-6 sm:p-12" role="status" aria-live="polite">
                                        <div className="max-w-md text-center">
                                            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
                                                <Wrench className="w-8 h-8 text-brand-gold" />
                                            </div>
                                            <h3 className="font-serif text-2xl font-bold text-slate-900 mb-3">Online booking is down for maintenance</h3>
                                            <p className="text-slate-600 mb-6">
                                                To book a room, please call {contact.name}, who can confirm your dates and get you set up.
                                            </p>
                                            <a
                                                href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                                                className="inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-yellow-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors min-h-[44px]"
                                            >
                                                <Phone className="w-5 h-5" />
                                                {contact.phone}
                                            </a>
                                            {range?.from && range?.to && (
                                                <p className="text-sm text-slate-500 mt-6">
                                                    We've saved your request for {format(range.from, 'MMM d')} – {format(range.to, 'MMM d')}, so {contact.name} will already have your details when you call. Your card has not been charged, and your dates aren't held until the booking is approved.
                                                </p>
                                            )}
                                            <button
                                                onClick={onClose}
                                                className="mt-6 text-sm font-semibold text-slate-600 hover:text-slate-900 underline min-h-[44px]"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                ) : loadingAvailability ? (
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
                                            {/* What is being booked. Hidden when no rooms are
                                                configured, which leaves the original whole-house flow. */}
                                            {rooms.length > 0 && (
                                                <div className="mb-4 sm:mb-6">
                                                    <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                                        <BedDouble className="w-4 h-4" /> What would you like to book?
                                                    </h3>
                                                    <div className="space-y-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedRoom(null)}
                                                            aria-pressed={selectedRoom === null}
                                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                                                selectedRoom === null
                                                                    ? "border-brand-gold bg-amber-50 ring-2 ring-brand-gold/30"
                                                                    : "border-gray-200 bg-white hover:bg-gray-50"
                                                            }`}
                                                        >
                                                            <Home className="w-4 h-4 text-slate-500 shrink-0" />
                                                            <span className="flex-1 min-w-0">
                                                                <span className="block font-medium text-slate-900 text-sm">The whole house</span>
                                                                <span className="block text-xs text-slate-500">Every room, up to {maxGuests} guests</span>
                                                            </span>
                                                        </button>

                                                        {rooms.map(room => (
                                                            <button
                                                                key={room.slug}
                                                                type="button"
                                                                onClick={() => setSelectedRoom(room.slug)}
                                                                aria-pressed={selectedRoom === room.slug}
                                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                                                    selectedRoom === room.slug
                                                                        ? "border-brand-gold bg-amber-50 ring-2 ring-brand-gold/30"
                                                                        : "border-gray-200 bg-white hover:bg-gray-50"
                                                                }`}
                                                            >
                                                                <BedDouble className="w-4 h-4 text-slate-500 shrink-0" />
                                                                <span className="flex-1 min-w-0">
                                                                    <span className="block font-medium text-slate-900 text-sm truncate">{room.name}</span>
                                                                    <span className="block text-xs text-slate-500 truncate">{room.beds} · sleeps {room.maxGuests}</span>
                                                                </span>
                                                                <span className="text-right shrink-0">
                                                                    <span className="block font-bold text-slate-900 text-sm">${room.weekdayPrice}</span>
                                                                    <span className="block text-[10px] text-slate-500 uppercase tracking-wide">per night</span>
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
                                                            onClick={() => setGuestCount(Math.min(effectiveMaxGuests, guestCount + 1))}
                                                            className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-slate-600 font-bold"
                                                            disabled={guestCount >= effectiveMaxGuests}
                                                        >+</button>
                                                    </div>
                                                </div>
                                                {/* Guest Info Inputs */}
                                                <div className="mt-4">
                                                    <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                                        <User className="w-4 h-4" /> Guest Information
                                                    </h4>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label htmlFor="guestName" className="block text-sm font-semibold text-slate-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                                                            <div className="relative">
                                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                                <input
                                                                    id="guestName"
                                                                    type="text"
                                                                    value={guestName}
                                                                    onChange={(e) => setGuestName(e.target.value)}
                                                                    placeholder="Jane Smith"
                                                                    autoComplete="name"
                                                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label htmlFor="guestEmail" className="block text-sm font-semibold text-slate-700 mb-2">Email <span className="text-red-500">*</span></label>
                                                            <input
                                                                id="guestEmail"
                                                                type="email"
                                                                value={guestEmail}
                                                                onChange={(e) => setGuestEmail(e.target.value)}
                                                                placeholder="you@email.com"
                                                                autoComplete="email"
                                                                className="w-full pr-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none"
                                                            />
                                                        </div>
                                                        {guestInfoError && <p className="text-red-500 text-xs">{guestInfoError}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Summary & Action */}
                                        <div className="md:col-span-3 lg:col-span-2 bg-slate-50/50 p-4 sm:p-5 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-serif font-bold text-base sm:text-lg md:text-xl mb-4 sm:mb-6 text-slate-900 border-b pb-2">Reservation Summary</h3>

                                                {range?.from && range?.to && quote && !quote.error ? (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4">
                                                            <span className="text-slate-500 block text-xs mb-0.5 font-medium">Booking</span>
                                                            <span className="font-bold text-slate-900 text-sm">{quote.roomName ?? "The whole house"}</span>
                                                        </div>

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
                                                            ) : quote?.error ? (
                                                                <div className="py-4 text-center text-red-600 bg-red-50 p-3 rounded-lg">
                                                                    <p className="text-sm font-medium">{quote.error}</p>
                                                                </div>
                                                            ) : quote ? (
                                                                <>
                                                                    <div className="flex justify-between items-center text-slate-700">
                                                                        <span className="font-medium">{quote.roomName ?? "Whole house"} ({quote.nights} nights)</span>
                                                                        <span className="font-semibold">${quote.accommodationTotal.toLocaleString()}</span>
                                                                    </div>

                                                                    <div className="flex justify-between items-start text-slate-700">
                                                                        <span className="flex items-center gap-1 font-medium">Cleaning Fee <Info className="w-3 h-3 text-slate-400" /></span>
                                                                        <span className="font-semibold">${quote.cleaningFee}</span>
                                                                    </div>

                                                                    {quote.discountAmount > 0 && (
                                                                        <div className="flex justify-between items-center text-green-700 bg-green-50 p-2 rounded">
                                                                            <span className="font-medium flex items-center gap-1"><Tag className="w-3 h-3" /> Discount ({appliedCoupon})</span>
                                                                            <span className="font-semibold">-${quote.discountAmount.toLocaleString()}</span>
                                                                        </div>
                                                                    )}

                                                                    {quote.tax && quote.tax.totAmount > 0 && (
                                                                        <div className="flex justify-between items-center text-slate-700">
                                                                            <span className="font-medium">Occupancy tax ({quote.tax.totRate}%)</span>
                                                                            <span className="font-semibold">${money(quote.tax.totAmount)}</span>
                                                                        </div>
                                                                    )}

                                                                    {quote.tax && quote.tax.assessmentAmount > 0 && (
                                                                        <div className="flex justify-between items-center text-slate-700">
                                                                            <span className="font-medium">{quote.tax.assessmentLabel} ({quote.tax.assessmentRate}%)</span>
                                                                            <span className="font-semibold">${money(quote.tax.assessmentAmount)}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : null}
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
                                                                    <span className="block font-bold text-2xl text-brand-gold">${money(quote.total)}</span>
                                                                    <span className="text-xs text-slate-600 block font-medium">
                                                                        {quote.tax?.totalTax ? "Includes occupancy tax & fees" : quote.tax?.exempt ? "Includes fees · long stays are tax-exempt" : "Includes fees"}
                                                                    </span>
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
                                                            Minimum {effectiveMinimumNights} nights required for this stay.
                                                        </p>
                                                    </div>
                                                )}

                                                {!onlineCheckoutEnabled && (
                                                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg flex items-start gap-2">
                                                        <Phone className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                                                        <p className="text-xs sm:text-sm text-slate-700">
                                                            Online payment is paused for maintenance. Send your request and call {contact.name} at{" "}
                                                            <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="font-semibold underline">{contact.phone}</a>{" "}
                                                            to book.
                                                        </p>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={handleCheckout}
                                                    disabled={loading || !range?.from || !range?.to || !meetsMinimum || hasDateConflict || !!quote?.error || !guestName.trim() || !guestEmail.trim()}
                                                    className="w-full bg-brand-gold hover:bg-yellow-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-bold text-base transition-all transform active:scale-95 shadow-lg shadow-brand-gold/30 hover:shadow-xl hover:shadow-brand-gold/40 flex items-center justify-center gap-2"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            {onlineCheckoutEnabled ? "Reserve with Stripe" : "Request to Book"}
                                                        </>
                                                    )}
                                                </button>

                                                {range?.from && range?.to && meetsMinimum && (!guestName.trim() || !guestEmail.trim()) && (
                                                    <p className="text-center text-xs text-amber-600 font-medium">
                                                        ↑ Please fill in your name and email to continue
                                                    </p>
                                                )}
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