"use client";
import { useState, useMemo } from "react";
import { SharedProps, Booking } from "@/app/admin/page";
import { Search, X, ChevronDown, Mail, Phone, Calendar, DollarSign, FileText, RefreshCw, Check } from "lucide-react";

function nightsBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function fmt(d: string, opts?: Intl.DateTimeFormatOptions) {
    return new Date(d).toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
    paid:      "bg-green-100 text-green-700 border-green-200",
    pending:   "bg-amber-100 text-amber-700 border-amber-200",
    cancelled: "bg-red-100 text-red-600 border-red-200",
};

type FilterStatus = "all" | "paid" | "pending" | "cancelled";

// ── Booking detail drawer ────────────────────────────────────────────────────
function BookingDrawer({ booking, onClose, onStatusChange, addToast }: {
    booking: Booking;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
    addToast: SharedProps["addToast"];
}) {
    const nights = nightsBetween(booking.startDate, booking.endDate);
    const [updating, setUpdating] = useState(false);
    const [status, setStatus]    = useState(booking.status);

    const updateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            const token = localStorage.getItem("admin_token") ?? "";
            const res = await fetch(`/api/admin/bookings/${booking.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setStatus(newStatus as any);
                onStatusChange(booking.id, newStatus);
                addToast(`Booking marked as ${newStatus}`, "success");
            } else {
                addToast("Failed to update booking", "error");
            }
        } catch {
            addToast("Network error", "error");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Reservation Details</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Guest */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0">
                            <span className="text-brand-gold font-bold text-lg">{booking.guestName[0].toUpperCase()}</span>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{booking.guestName}</p>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[status]}`}>
                                {status}
                            </span>
                        </div>
                    </div>

                    {/* Dates */}
                    <Card>
                        <Row icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Check-in"  value={fmt(booking.startDate)} />
                        <Row icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Check-out" value={fmt(booking.endDate)} />
                        <Row icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Duration"  value={`${nights} night${nights !== 1 ? "s" : ""}`} />
                        {booking.guestCount ? <Row icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Guests" value={String(booking.guestCount)} /> : null}
                    </Card>

                    {/* Payment */}
                    <Card>
                        <Row icon={<DollarSign className="w-4 h-4 text-gray-400" />} label="Total" value={`$${booking.totalPrice.toFixed(2)}`} bold />
                        {booking.stripePaymentIntentId && (
                            <Row icon={<DollarSign className="w-4 h-4 text-gray-400" />} label="Stripe ID"
                                value={<span className="font-mono text-xs text-gray-500 break-all">{booking.stripePaymentIntentId}</span>} />
                        )}
                    </Card>

                    {/* Contact */}
                    <Card>
                        <Row icon={<Mail className="w-4 h-4 text-gray-400" />} label="Email"
                            value={<a href={`mailto:${booking.email}`} className="text-brand-gold hover:underline">{booking.email}</a>} />
                    </Card>

                    {/* Notes */}
                    {booking.notes && (
                        <Card>
                            <Row icon={<FileText className="w-4 h-4 text-gray-400" />} label="Notes" value={booking.notes} />
                        </Card>
                    )}

                    {/* Created */}
                    {booking.createdAt && (
                        <p className="text-xs text-gray-400">Booked {fmt(booking.createdAt, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    )}
                </div>

                {/* Status actions */}
                <div className="p-4 border-t border-gray-100 space-y-2">
                    <p className="text-xs font-medium text-gray-500 mb-2">Update Status</p>
                    <div className="grid grid-cols-3 gap-2">
                        {(["paid", "pending", "cancelled"] as const).map(s => (
                            <button
                                key={s} onClick={() => updateStatus(s)} disabled={updating || status === s}
                                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                                    status === s
                                        ? `${STATUS_STYLES[s]} opacity-100 cursor-default`
                                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                } disabled:opacity-50 capitalize`}
                            >
                                {status === s ? <span className="flex items-center justify-center gap-1"><Check className="w-3 h-3" />{s}</span> : s}
                            </button>
                        ))}
                    </div>
                    <a
                        href={`mailto:${booking.email}?subject=Your Booking at Whistle Inn`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition mt-2"
                    >
                        <Mail className="w-4 h-4" /> Email Guest
                    </a>
                </div>
            </div>
        </>
    );
}

function Card({ children }: { children: React.ReactNode }) {
    return <div className="bg-gray-50 rounded-xl p-3 space-y-2.5">{children}</div>;
}

function Row({ icon, label, value, bold }: { icon: React.ReactNode; label: string; value: React.ReactNode; bold?: boolean }) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="mt-0.5">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-sm ${bold ? "font-bold text-gray-900" : "text-gray-700"} mt-0.5`}>{value}</p>
            </div>
        </div>
    );
}

// ── Main view ────────────────────────────────────────────────────────────────
export function ReservationsView({ bookings: rawBookings, refreshData, dataLoading, addToast }: SharedProps) {
    const [search, setSearch]     = useState("");
    const [filter, setFilter]     = useState<FilterStatus>("all");
    const [selected, setSelected] = useState<Booking | null>(null);
    const [bookings, setBookings] = useState(rawBookings);

    // Keep local bookings in sync with prop (initial load)
    useMemo(() => setBookings(rawBookings), [rawBookings]);

    const filtered = useMemo(() => {
        let list = bookings;
        if (filter !== "all") list = list.filter(b => b.status === filter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(b =>
                b.guestName.toLowerCase().includes(q) ||
                b.email.toLowerCase().includes(q) ||
                b.id.toLowerCase().includes(q)
            );
        }
        return [...list].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [bookings, filter, search]);

    const handleStatusChange = (id: string, status: string) => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as any } : b));
    };

    const counts = useMemo(() => ({
        all:       bookings.length,
        paid:      bookings.filter(b => b.status === "paid").length,
        pending:   bookings.filter(b => b.status === "pending").length,
        cancelled: bookings.filter(b => b.status === "cancelled").length,
    }), [bookings]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">Reservations</h1>
                <button onClick={refreshData} disabled={dataLoading}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                    <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {(["all", "paid", "pending", "cancelled"] as FilterStatus[]).map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                            filter === s
                                ? "bg-brand-gold text-white shadow-sm"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}>
                        {s} <span className="opacity-70">({counts[s]})</span>
                    </button>
                ))}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Calendar className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400">{search ? "No results found" : "No reservations yet"}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(b => {
                        const nights = nightsBetween(b.startDate, b.endDate);
                        const isPast = new Date(b.endDate) < new Date();
                        return (
                            <button
                                key={b.id} onClick={() => setSelected(b)}
                                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-brand-gold/30 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPast ? "bg-gray-100" : "bg-brand-gold/10"}`}>
                                        <span className={`font-bold text-sm ${isPast ? "text-gray-400" : "text-brand-gold"}`}>
                                            {b.guestName[0].toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`font-semibold text-sm truncate ${isPast ? "text-gray-500" : "text-gray-900"}`}>{b.guestName}</p>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 border ${STATUS_STYLES[b.status]}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {fmt(b.startDate, { month: "short", day: "numeric" })} → {fmt(b.endDate, { month: "short", day: "numeric" })}
                                            {" · "}{nights} night{nights !== 1 ? "s" : ""}
                                        </p>
                                        <p className="text-xs font-semibold text-gray-700 mt-1">${b.totalPrice.toFixed(0)}</p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-300 shrink-0 -rotate-90 mt-1" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Drawer */}
            {selected && (
                <BookingDrawer
                    booking={selected}
                    onClose={() => setSelected(null)}
                    onStatusChange={handleStatusChange}
                    addToast={addToast}
                />
            )}
        </div>
    );
}
