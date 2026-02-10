"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-context";

type Booking = {
    id: string;
    startDate: string;
    endDate: string;
    guestName: string;
    email: string;
    totalPrice: number;
    status: string;
    notes?: string;
};

export function BookingsTable() {
    const { addToast } = useToast();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const t = localStorage.getItem('admin_token');
        setToken(t);
        fetchBookings(t);
    }, []);

    const fetchBookings = async (authToken?: string | null) => {
        setLoading(true);
        const headers: any = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        try {
            const res = await fetch('/api/admin/bookings', { headers });
            const data = await res.json();
            setBookings(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/bookings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status }),
            });
            const updated = await res.json();
            setBookings((prev) => prev.map(b => b.id === id ? updated : b));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resendConfirmation = async (booking: Booking) => {
        try {
            await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: booking.email,
                    templateName: 'booking_confirmation',
                    variables: {
                        guestName: booking.guestName,
                        startDate: new Date(booking.startDate).toLocaleDateString(),
                        endDate: new Date(booking.endDate).toLocaleDateString(),
                        bookingId: booking.id,
                    },
                    bookingId: booking.id,
                }),
            });
            addToast('Confirmation sent', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to send confirmation', 'error');
        }
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Bookings</h2>
                <div className="text-sm text-gray-500">{loading ? 'Loading...' : `${bookings.length} bookings`}</div>
            </div>

            <div className="md:hidden space-y-4">
                {bookings.map(b => (
                    <div key={b.id} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-slate-900">{b.guestName}</h3>
                                <p className="text-sm text-slate-500">{b.email}</p>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-slate-900">${b.totalPrice}</div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {b.status}
                                </span>
                            </div>
                        </div>

                        <div className="text-sm text-slate-600">
                            <span className="font-medium">Dates:</span> {new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 mt-2">
                            <select
                                value={b.status}
                                onChange={(e) => updateStatus(b.id, e.target.value)}
                                className="p-2 border border-slate-300 rounded text-sm flex-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                                onClick={() => resendConfirmation(b)}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                            >
                                Resend
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="py-3 px-4 font-semibold text-slate-700">Guest</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">Dates</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">Price</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">Status</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {bookings.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No bookings found</td></tr>
                        ) : bookings.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4">
                                    <div className="font-medium text-slate-900">{b.guestName}</div>
                                    <div className="text-xs text-slate-500">{b.email}</div>
                                </td>
                                <td className="py-3 px-4 text-slate-600 text-sm">
                                    {new Date(b.startDate).toLocaleDateString()}
                                    <span className="mx-1 text-slate-400">→</span>
                                    {new Date(b.endDate).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-900">
                                    ${b.totalPrice}
                                </td>
                                <td className="py-3 px-4">
                                    <select 
                                        value={b.status} 
                                        onChange={(e) => updateStatus(b.id, e.target.value)} 
                                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-brand-gold pr-8 ${
                                            b.status === 'paid' ? 'bg-green-100 text-green-700' : 
                                            b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </td>
                                <td className="py-3 px-4">
                                    <button 
                                        onClick={() => resendConfirmation(b)} 
                                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-3 py-1 rounded hover:bg-blue-50"
                                    >
                                        Resend Email
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
