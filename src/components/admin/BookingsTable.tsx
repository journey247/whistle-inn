"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-context";
import { X, Mail, Calendar, User, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";

type Booking = {
    id: string;
    startDate: string;
    endDate: string;
    guestName: string;
    email: string;
    totalPrice: number;
    status: string;
    notes?: string;
    stripeSessionId?: string;
    guestCount?: number;
    discount?: number;
    createdAt?: string;
};

function BookingDetailModal({ booking, onClose, onStatusChange, onDelete }: {
    booking: Booking;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
    onDelete: (id: string) => void;
}) {
    const nights = Math.round(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Booking Details</h2>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">{booking.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Status badge */}
                    <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                            booking.status === 'paid' ? 'bg-green-100 text-green-700' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                        {booking.createdAt && (
                            <span className="text-xs text-slate-400">
                                Booked {format(new Date(booking.createdAt), 'MMM d, yyyy')}
                            </span>
                        )}
                    </div>

                    {/* Guest Info */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Guest</h3>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-gold flex items-center justify-center text-white font-bold flex-shrink-0">
                                {booking.guestName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">{booking.guestName}</p>
                                <p className="text-sm text-slate-500">{booking.email}</p>
                            </div>
                        </div>
                        {booking.guestCount && booking.guestCount > 0 && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <User className="w-4 h-4 text-slate-400" />
                                {booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}
                            </div>
                        )}
                    </div>

                    {/* Stay Dates */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stay</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Check-in</p>
                                <p className="font-semibold text-slate-900">{format(new Date(booking.startDate), 'MMM d, yyyy')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Check-out</p>
                                <p className="font-semibold text-slate-900">{format(new Date(booking.endDate), 'MMM d, yyyy')}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">{nights} {nights === 1 ? 'night' : 'nights'}</p>
                    </div>

                    {/* Payment */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment</h3>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Total</span>
                            <span className="text-xl font-bold text-slate-900">${booking.totalPrice.toLocaleString()}</span>
                        </div>
                        {booking.discount && booking.discount > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-green-600">Discount applied</span>
                                <span className="text-green-600 font-medium">-${booking.discount.toLocaleString()}</span>
                            </div>
                        )}
                        {booking.stripeSessionId && (
                            <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs text-slate-400 mb-1">Stripe Session</p>
                                <p className="text-xs font-mono text-slate-500 break-all">{booking.stripeSessionId}</p>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    {booking.notes && (
                        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                            <h3 className="text-xs font-semibold text-yellow-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Notes
                            </h3>
                            <p className="text-sm text-yellow-900">{booking.notes}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                        <select
                            value={booking.status}
                            onChange={e => onStatusChange(booking.id, e.target.value)}
                            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                        >
                            <option value="pending">Mark Pending</option>
                            <option value="paid">Mark Paid</option>
                            <option value="cancelled">Mark Cancelled</option>
                        </select>
                        <a
                            href={`mailto:${booking.email}`}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-gold hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition"
                        >
                            <Mail className="w-4 h-4" />
                            Email Guest
                        </a>
                    </div>
                    {booking.status === 'cancelled' && (
                        <div className="pt-2">
                            <button
                                onClick={() => onDelete(booking.id)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Booking Record
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function BookingsTable() {
    const { addToast } = useToast();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    useEffect(() => {
        const t = localStorage.getItem('adminToken');
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
        // Find the booking to check if it was paid (refund warning)
        const booking = bookings.find(b => b.id === id);

        if (status === 'cancelled') {
            const wasPaid = booking?.status === 'paid';
            const msg = wasPaid
                ? `Cancel this booking and issue a full Stripe refund to ${booking?.guestName}? This cannot be undone.`
                : `Cancel this booking for ${booking?.guestName}? This cannot be undone.`;
            if (!window.confirm(msg)) return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/bookings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update');
            }
            const updated = await res.json();
            setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
            setSelectedBooking(prev => prev?.id === id ? { ...prev, status } : prev);
            const msg = status === 'cancelled' && booking?.status === 'paid'
                ? 'Booking cancelled and refund issued'
                : `Booking marked as ${status}`;
            addToast(msg, 'success');
        } catch (err: any) {
            console.error(err);
            addToast(err.message || 'Failed to update status', 'error');
        } finally {
            setLoading(false);
        }
    };

    const deleteBooking = async (id: string) => {
        if (!window.confirm('Permanently delete this cancelled booking? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/admin/bookings/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete');
            }
            setBookings(prev => prev.filter(b => b.id !== id));
            setSelectedBooking(null);
            addToast('Booking deleted', 'success');
        } catch (err: any) {
            console.error(err);
            addToast(err.message || 'Failed to delete booking', 'error');
        }
    };

    const clearCancelledBookings = async () => {
        const cancelled = bookings.filter(b => b.status === 'cancelled');
        if (cancelled.length === 0) { addToast('No cancelled bookings to clear', 'info'); return; }
        if (!window.confirm(`Permanently delete all ${cancelled.length} cancelled booking(s)? This cannot be undone.`)) return;
        let deleted = 0;
        for (const b of cancelled) {
            try {
                const res = await fetch(`/api/admin/bookings/${b.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (res.ok) deleted++;
            } catch { /* continue */ }
        }
        setBookings(prev => prev.filter(b => b.status !== 'cancelled'));
        setSelectedBooking(null);
        addToast(`Deleted ${deleted} cancelled booking(s)`, 'success');
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
            {selectedBooking && (
                <BookingDetailModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    onStatusChange={updateStatus}
                    onDelete={deleteBooking}
                />
            )}

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Guest Reservations</h2>
                <div className="flex items-center gap-3">
                    {bookings.some(b => b.status === 'cancelled') && (
                        <button
                            onClick={clearCancelledBookings}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear Cancelled
                        </button>
                    )}
                    <div className="text-sm text-gray-500">{loading ? 'Loading...' : `${bookings.length} reservations`}</div>
                </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-4">
                {bookings.map(b => (
                    <div
                        key={b.id}
                        className="border rounded-lg p-4 space-y-3 bg-slate-50 cursor-pointer hover:border-brand-gold transition-colors"
                        onClick={() => setSelectedBooking(b)}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-slate-900">{b.guestName}</h3>
                                <p className="text-sm text-slate-500">{b.email}</p>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-slate-900">${b.totalPrice}</div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'paid' ? 'bg-green-100 text-green-700' : b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {b.status}
                                </span>
                            </div>
                        </div>

                        <div className="text-sm text-slate-600">
                            <span className="font-medium">Stay:</span> {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 mt-2" onClick={e => e.stopPropagation()}>
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

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="py-3 px-4 font-semibold text-slate-700">Guest</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">Stay Dates</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">Total</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">Status</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {bookings.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No bookings found</td></tr>
                        ) : bookings.map(b => (
                            <tr
                                key={b.id}
                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => setSelectedBooking(b)}
                            >
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
                                <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                                    <select
                                        value={b.status}
                                        onChange={(e) => updateStatus(b.id, e.target.value)}
                                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-brand-gold pr-8 ${b.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </td>
                                <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
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
