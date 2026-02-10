"use client";

import React, { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export function CalendarView() {
    const [bookedDates, setBookedDates] = useState<Date[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/availability');
            const bookings = await res.json();
            const blockedDates: Date[] = [];

            bookings.forEach((booking: any) => {
                const start = new Date(booking.startDate);
                const end = new Date(booking.endDate);
                const current = new Date(start);
                while (current < end) {
                    blockedDates.push(new Date(current));
                    current.setDate(current.getDate() + 1);
                }
            });

            setBookedDates(blockedDates);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded shadow p-4 overflow-x-auto">
            <h3 className="font-semibold mb-3">Bookings Calendar</h3>
            {loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
            ) : (
                <div className="flex justify-center">
                    <DayPicker
                        mode="single"
                        disabled={[{ before: new Date() }, ...bookedDates]}
                        modifiers={{ booked: bookedDates }}
                        modifiersStyles={{ booked: { backgroundColor: '#ef4444', color: 'white' } }}
                    />
                </div>
            )}
        </div>
    );
}
