"use client";

import React, { useEffect, useState } from 'react';
import { DayPicker, DateRange, DayClickEventHandler } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useToast } from '../ui/toast-context';
import { X, Lock, Loader2, Info, Calendar as CalendarIcon, User, Globe } from 'lucide-react';
import { format } from 'date-fns';

type CalendarEvent = {
    id: string;
    type: 'internal' | 'external' | 'blocked';
    title: string;
    start: string;
    end: string;
    status: string;
    notes?: string;
    source: string;
};

export function CalendarView() {
    const { addToast } = useToast();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Selection for blocking
    const [range, setRange] = useState<DateRange | undefined>();
    const [isBlocking, setIsBlocking] = useState(false);
    const [blockNotes, setBlockNotes] = useState('');

    // Selection for viewing details
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [activeEvents, setActiveEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/calendar/events', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setEvents(await res.json());
            }
        } catch (err) {
            console.error(err);
            addToast("Failed to load calendar", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleBlockDates = async () => {
        if (!range?.from || !range?.to) return;
        setIsBlocking(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch("/api/admin/external-bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    source: "Blocked",
                    guestName: "Manual Block",
                    startDate: range.from,
                    endDate: range.to,
                    notes: blockNotes || "Blocked using Admin Calendar"
                }),
            });

            if (!res.ok) throw new Error('Failed to block');
            addToast("Dates blocked successfully", "success");
            setRange(undefined);
            setBlockNotes('');
            fetchEvents();
        } catch (error) {
            addToast("Failed to block dates", "error");
        } finally {
            setIsBlocking(false);
        }
    };

    const handleDayClick: DayClickEventHandler = (day, modifiers) => {
        // Find events on this day
        // Standardize to midnight for comparison
        // "Night of" logic: A booking covers the start date, up to (but not including) end date.
        const dayTime = day.getTime();

        const dayEvents = events.filter(e => {
            const start = new Date(e.start);
            const end = new Date(e.end);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            return dayTime >= start.getTime() && dayTime < end.getTime();
        });

        if (dayEvents.length > 0) {
            setSelectedDate(day);
            setActiveEvents(dayEvents);
            // Clear range selection if we clicked an existing event to avoid confusion
            setRange(undefined);
        } else {
            // It's a free day, allow range selection to proceed (handled by onSelect)
            setSelectedDate(undefined);
            setActiveEvents([]);
        }
    };

    // Modifiers - map events to DateRanges
    // Range end is exclusive for visuals (night before checkout)
    const getModifierRanges = (type: string) => {
        return events
            .filter(e => e.type === type)
            .map(e => ({
                from: new Date(e.start),
                to: new Date(new Date(e.end).setHours(0, 0, 0, 0) - 1)
            }));
    };

    const internalDates = getModifierRanges('internal');
    const externalDates = getModifierRanges('external');
    const blockedDates = getModifierRanges('blocked');

    return (
        <div className="flex flex-col xl:flex-row gap-8 items-start">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm w-full md:w-auto overflow-auto">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
                    </div>
                ) : (
                    <DayPicker
                        mode="range"
                        selected={range}
                        onSelect={setRange}
                        onDayClick={handleDayClick}
                        modifiers={{
                            internal: internalDates,
                            external: externalDates,
                            blocked: blockedDates
                        }}
                        modifiersStyles={{
                            internal: { backgroundColor: '#d1fae5', color: '#065f46', fontWeight: 'bold' },
                            external: { backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 'bold' },
                            blocked: { backgroundColor: '#f1f5f9', color: '#64748b', textDecoration: 'line-through' }
                        }}
                        disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                        className="m-0 admin-calendar text-slate-900 [&_*]:text-slate-900"
                        style={{ color: '#0f172a' }}
                    />
                )}
                <div className="flex flex-wrap gap-4 mt-6 text-xs text-slate-500 justify-center border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-600"></span>
                        <span>Whistle Inn Guests</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-sky-100 border border-sky-600"></span>
                        <span>Airbnb/VRBO Guests</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-400"></span>
                        <span>Blocked Dates</span>
                    </div>
                </div>
            </div>

            {/* Side Panel */}
            <div className="w-full xl:w-96 space-y-6">

                {/* Event Details Panel */}
                {selectedDate && activeEvents.length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg animate-in slide-in-from-right-4 ring-1 ring-slate-100">
                        <div className="flex justify-between items-start mb-6">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                                <Info className="w-5 h-5 text-brand-gold" />
                                {format(selectedDate, 'MMMM d, yyyy')}
                            </h4>
                            <button onClick={() => setSelectedDate(undefined)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {activeEvents.map(evt => (
                                <div key={evt.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        {evt.type === 'internal' && <User className="w-4 h-4 text-emerald-600" />}
                                        {evt.type === 'external' && <Globe className="w-4 h-4 text-sky-600" />}
                                        {evt.type === 'blocked' && <Lock className="w-4 h-4 text-slate-500" />}
                                        <span className="font-bold text-slate-900 text-base">{evt.title}</span>
                                    </div>
                                    <div className="text-slate-600 space-y-2">
                                        <div className="grid grid-cols-2 gap-2 text-xs uppercase tracking-wide text-slate-400 font-semibold">
                                            <div>Check-in</div>
                                            <div>Check-out</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 font-medium">
                                            <div>{format(new Date(evt.start), 'MMM d, yyyy')}</div>
                                            <div>{format(new Date(evt.end), 'MMM d, yyyy')}</div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-200 mt-3 flex justify-between items-center text-xs">
                                            <span className="text-slate-500">Source: {evt.source}</span>
                                            {evt.status && (
                                                <span className={`px-2 py-0.5 rounded-full ${evt.status === 'confirmed' || evt.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                                                    }`}>
                                                    {evt.status}
                                                </span>
                                            )}
                                        </div>
                                        {evt.notes && (
                                            <div className="mt-3 p-2 bg-yellow-50 text-yellow-800 rounded border border-yellow-100 text-xs italic">
                                                "{evt.notes}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Blocking Panel */}
                {range?.from && !selectedDate && (
                    <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-xl animate-in slide-in-from-right-4">
                        <h4 className="font-bold mb-6 flex items-center gap-2 text-lg">
                            <Lock className="w-5 h-5 text-brand-gold" />
                            Block Dates
                        </h4>

                        <div className="space-y-5">
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <div className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Selected Range</div>
                                <div className="font-mono text-lg text-white">
                                    {format(range.from, 'MMM d')} - {range.to ? format(range.to, 'MMM d') : '...'}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-2 font-medium">Reason / Note</label>
                                <textarea
                                    className="w-full bg-slate-800 border-slate-700 rounded-lg text-slate-200 focus:ring-brand-gold focus:border-brand-gold p-3 text-sm placeholder:text-slate-600"
                                    rows={3}
                                    placeholder="e.g., Maintenance, Personal Stay, Renovation"
                                    value={blockNotes}
                                    onChange={e => setBlockNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleBlockDates}
                                    disabled={!range.to || isBlocking}
                                    className="flex-1 bg-brand-gold hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-brand-gold/20"
                                >
                                    {isBlocking ? 'Processing...' : 'Confirm Block'}
                                </button>
                                <button
                                    onClick={() => setRange(undefined)}
                                    className="px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-900 font-medium mb-1">Property Calendar</h3>
                    <p className="text-sm text-slate-500 max-w-[200px] mx-auto">
                        Select dates to block them off, or click existing bookings to see guest details.
                    </p>
                </div>
            </div>
        </div>
    );
}
