"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Calendar, Mail, Loader2, Home, XCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface BookingDetails {
    id: string;
    startDate: string;
    endDate: string;
    guestName: string;
    email: string;
    totalPrice: number;
    status: string;
}

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const bookingId = searchParams.get("booking_id");
    
    const [booking, setBooking] = useState<BookingDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId || !bookingId) {
            setError("Missing booking information");
            setLoading(false);
            return;
        }

        // Fetch booking details
        const fetchBooking = async () => {
            try {
                const response = await fetch(`/api/bookings/${bookingId}`);
                
                if (!response.ok) {
                    throw new Error("Failed to fetch booking details");
                }

                const data = await response.json();
                setBooking(data);
            } catch (err: any) {
                console.error("Error fetching booking:", err);
                setError(err.message || "Failed to load booking details");
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [sessionId, bookingId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-brand-gold mx-auto mb-4" />
                    <p className="text-slate-600">Loading your booking details...</p>
                </div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
                >
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="font-serif text-2xl font-bold text-slate-800 mb-2">
                        Booking Error
                    </h1>
                    <p className="text-slate-600 mb-6">
                        {error || "Unable to load booking details"}
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 bg-brand-gold hover:bg-yellow-500 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                    >
                        <Home className="w-5 h-5" />
                        Return Home
                    </Link>
                </motion.div>
            </div>
        );
    }

    const isPaid = booking.status === "paid";
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden"
            >
                {/* Success Header */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                        <CheckCircle className="w-20 h-20 text-white mx-auto mb-4" />
                    </motion.div>
                    <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-2">
                        Booking Confirmed!
                    </h1>
                    <p className="text-white/90 text-lg">
                        Your reservation has been successfully processed
                    </p>
                </div>

                {/* Booking Details */}
                <div className="p-8">
                    <div className="space-y-6">
                        {/* Status Badge */}
                        {isPaid && (
                            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                                <CheckCircle className="w-4 h-4" />
                                Payment Confirmed
                            </div>
                        )}

                        {/* Guest Information */}
                        <div className="border-t pt-6">
                            <h2 className="font-serif text-xl font-bold text-slate-800 mb-4">
                                Reservation Details
                            </h2>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-slate-500">Check-in</p>
                                        <p className="font-semibold text-slate-800">
                                            {format(startDate, "EEEE, MMMM d, yyyy")}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-slate-500">Check-out</p>
                                        <p className="font-semibold text-slate-800">
                                            {format(endDate, "EEEE, MMMM d, yyyy")}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-slate-500">Confirmation email sent to</p>
                                        <p className="font-semibold text-slate-800">{booking.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Booking Summary */}
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <h3 className="font-serif font-bold text-lg mb-4 text-slate-800">
                                Booking Summary
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Booking ID</span>
                                    <span className="font-mono text-xs">{booking.id}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Duration</span>
                                    <span className="font-medium">{nights} {nights === 1 ? "night" : "nights"}</span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                                    <span className="font-semibold text-slate-800">Total Paid</span>
                                    <span className="font-bold text-brand-gold text-lg">
                                        ${booking.totalPrice.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Next Steps */}
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                            <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
                            <ul className="space-y-2 text-sm text-blue-800">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 font-bold">•</span>
                                    <span>A confirmation email has been sent to {booking.email}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 font-bold">•</span>
                                    <span>You'll receive check-in instructions 24 hours before your arrival</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 font-bold">•</span>
                                    <span>If you have any questions, please contact us</span>
                                </li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Link
                                href="/"
                                className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-yellow-500 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                            >
                                <Home className="w-5 h-5" />
                                Return Home
                            </Link>
                            <button
                                onClick={() => window.print()}
                                className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all"
                            >
                                Print Confirmation
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
