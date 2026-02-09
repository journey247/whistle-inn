"use client";

import React, { useEffect, useState } from "react";

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
            alert('Confirmation sent');
        } catch (err) {
            console.error(err);
            alert('Failed to send confirmation');
        }
    };

    return (
        <div className="bg-white rounded shadow p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Bookings</h2>
                <div className="text-sm text-gray-500">{loading ? 'Loading...' : `${bookings.length} bookings`}</div>
            </div>

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-600 border-b">
                        <th className="p-2">Guest</th>
                        <th className="p-2">Dates</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {bookings.map(b => (
                        <tr key={b.id} className="border-b">
                            <td className="p-2">{b.guestName}<div className="text-xs text-gray-400">{b.email}</div></td>
                            <td className="p-2">{new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</td>
                            <td className="p-2">${b.totalPrice}</td>
                            <td className="p-2">
                                <select value={b.status} onChange={(e) => updateStatus(b.id, e.target.value)} className="p-2 border rounded">
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </td>
                            <td className="p-2 space-x-2">
                                <button onClick={() => resendConfirmation(b)} className="px-3 py-1 bg-blue-500 text-white rounded">Resend</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
