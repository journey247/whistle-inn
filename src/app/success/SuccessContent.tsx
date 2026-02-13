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

export default function SuccessContent() {
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <Loader2 className="w-12 h-12 animate-spin text-brand-gold mx-auto mb-4" />
                    <p className="text-slate-600">Loading your booking details...</p>
                </motion.div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md mx-auto px-4"
                >
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Booking Error</h1>
                    <p className="text-slate-600 mb-6">
                        {error || "Unable to load booking details. Please contact support if this persists."}
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center px-6 py-3 bg-brand-gold text-white font-semibold rounded-full hover:bg-yellow-500 transition-colors"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Return Home
                    </Link>
                </motion.div>
            </div>
        );
    }

    const isPaid = booking.status === "paid";
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        {isPaid ? (
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        ) : (
                            <Calendar className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        )}
                        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
                            {isPaid ? "Booking Confirmed!" : "Booking Pending"}
                        </h1>
                        <p className="text-lg text-slate-600">
                            {isPaid
                                ? "Your reservation at Whistle Inn has been confirmed"
                                : "Your booking is being processed. We'll send you a confirmation email shortly."
                            }
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Booking Details */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-lg shadow-sm p-6 sm:p-8"
                >
                    <h2 className="text-2xl font-semibold text-slate-800 mb-6">Booking Details</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-medium text-slate-700 mb-2">Guest Information</h3>
                            <div className="space-y-2 text-slate-600">
                                <p><strong>Name:</strong> {booking.guestName}</p>
                                <p><strong>Email:</strong> {booking.email}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-medium text-slate-700 mb-2">Stay Details</h3>
                            <div className="space-y-2 text-slate-600">
                                <p><strong>Check-in:</strong> {format(startDate, "MMMM d, yyyy")}</p>
                                <p><strong>Check-out:</strong> {format(endDate, "MMMM d, yyyy")}</p>
                                <p><strong>Booking ID:</strong> {booking.id}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-medium text-slate-700">Total Amount</span>
                            <span className="text-2xl font-bold text-brand-gold">
                                ${booking.totalPrice.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {isPaid && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg"
                        >
                            <div className="flex items-center">
                                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                <span className="text-green-800 font-medium">Payment completed successfully</span>
                            </div>
                        </motion.div>
                    )}
                </motion.div>

                {/* Next Steps */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 bg-white rounded-lg shadow-sm p-6 sm:p-8"
                >
                    <h2 className="text-2xl font-semibold text-slate-800 mb-6">What's Next?</h2>

                    <div className="space-y-4">
                        <div className="flex items-start">
                            <Mail className="w-6 h-6 text-brand-gold mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="font-medium text-slate-800">Confirmation Email</h3>
                                <p className="text-slate-600">
                                    You'll receive a detailed confirmation email at {booking.email} with all the information you need for your stay.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <Calendar className="w-6 h-6 text-brand-gold mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="font-medium text-slate-800">Check-in Instructions</h3>
                                <p className="text-slate-600">
                                    Detailed check-in instructions and property information will be included in your confirmation email.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <Link
                            href="/"
                            className="inline-flex items-center px-6 py-3 bg-brand-gold text-white font-semibold rounded-full hover:bg-yellow-500 transition-colors"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Return to Home
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}