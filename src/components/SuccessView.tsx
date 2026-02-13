"use client";

import Link from 'next/link';
import { CheckCircle, Home, Printer } from 'lucide-react';

interface SuccessViewProps {
    booking: {
        id: string;
        guestName: string;
        email: string;
        startDate: Date;
        endDate: Date;
        guestCount: number;
        totalPrice: number;
    }
}

export function SuccessView({ booking }: SuccessViewProps) {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Success Header */}
                    <div className="bg-green-600 p-8 text-center text-white">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-serif font-bold mb-2">Booking Confirmed!</h1>
                        <p className="text-green-100">Thank you for choosing Whistle Inn.</p>
                    </div>

                    {/* Booking Details */}
                    <div className="p-8">
                        <div className="border-b border-gray-100 pb-6 mb-6">
                            <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Confirmation Code</p>
                            <p className="text-2xl font-mono text-slate-800 tracking-wide select-all">{booking.id.slice(0, 8).toUpperCase()}</p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-slate-600">Guest</span>
                                <span className="font-medium text-slate-900">{booking.guestName}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-slate-600">Check-in</span>
                                <span className="font-medium text-slate-900">{new Date(booking.startDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-slate-600">Check-out</span>
                                <span className="font-medium text-slate-900">{new Date(booking.endDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-slate-600">Guests</span>
                                <span className="font-medium text-slate-900">{booking.guestCount || 1}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-slate-600">Total Paid</span>
                                <span className="font-bold text-lg text-brand-gold">${booking.totalPrice.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 mb-8 border border-slate-100">
                            <p className="text-sm text-slate-600 text-center">
                                A confirmation email has been sent to <span className="font-medium text-slate-800">{booking.email}</span>
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Link
                                href="/"
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Return Home
                            </Link>
                            <button
                                onClick={() => window.print()}
                                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
