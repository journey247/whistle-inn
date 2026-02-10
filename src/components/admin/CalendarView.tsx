"use client";

import React, { useEffect, useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useToast } from '../ui/toast-context';
import { X, Lock, Loader2 } from 'lucide-react';

export function CalendarView() {
    const { addToast } = useToast();
    const [bookedDates, setBookedDates] = useState<Date[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<DateRange | undefined>();
    const [isBlocking, setIsBlocking] = useState(false);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/availability');
            const bookings = await res.json();
            const blockedDates: Date[] = [];

            bookings.forEach((booking: { startDate: string; endDate: string }) => {
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
            addToast("Failed to load availability", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleBlockDates = async () => {
        if (!range?.from || !range?.to) return;

        setIsBlocking(true);
        try {
            const res = await fetch("/api/admin/external-bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source: "Blocked",
                    guestName: "Manual Block",
                    startDate: range.from,
                    endDate: range.to,
                    notes: notes || "Blocked by Admin"
                }),
            });

            if (!res.ok) throw new Error('Failed to block');

            addToast("Dates blocked successfully", "success");
            setRange(undefined);
            setNotes('');
            fetchAvailability();
        } catch (error) {
            addToast("Failed to block dates", "error");
        } finally {
            setIsBlocking(false);
        }
    };

    return (
        <div className="overflow-x-auto relative">
            {loading ? (
                <div className="flex justify-center p-8 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : (
                <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
                    <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm text-slate-900 [&_.rdp-caption_label]:text-slate-900 [&_.rdp-head_cell]:text-slate-500 [&_.rdp-day_button:disabled]:text-slate-300">
                        <DayPicker
                            mode="range"
                            selected={range}
                            onSelect={setRange}
                            disabled={[{ before: new Date() }, ...bookedDates]}
                            modifiers={{ booked: bookedDates }}
                            modifiersStyles={{ booked: { backgroundColor: '#ef4444', color: 'white' } }}
                            className="m-0"
                        />
                    </div>

                    <div className="w-full md:w-64 space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-slate-500" />
                                Block Dates
                            </h4>
                            {!range?.from ? (
                                <p className="text-sm text-slate-500">Select a date range on the calendar to manually block it.</p>
                            ) : (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="text-sm">
                                        <div className="text-slate-500">Selected Range:</div>
                                        <div className="font-medium text-slate-900">
                                            {range.from.toLocaleDateString()}
                                            {range.to && ` - ${range.to.toLocaleDateString()}`}
                                        </div>
                                    </div>

                                    <textarea
                                        placeholder="Reason (optional)"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full text-sm border-slate-300 rounded-md focus:ring-brand-gold focus:border-brand-gold"
                                        rows={2}
                                    />

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleBlockDates}
                                            disabled={!range.to || isBlocking}
                                            className="flex-1 bg-slate-900 text-white text-sm py-2 rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isBlocking ? 'Blocking...' : 'Confirm Block'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setRange(undefined);
                                                setNotes('');
                                            }}
                                            className="p-2 border border-slate-300 rounded-md hover:bg-slate-100 text-slate-600"
                                            title="Clear Selection"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-red-50 text-red-800 text-sm rounded-lg border border-red-100 flex gap-2">
                            <div className="w-3 h-3 mt-1 rounded-full bg-red-500 shrink-0" />
                            <p>Red dates are already booked or blocked.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
