"use client";
import { useState, useMemo, useEffect } from "react";
import { getAdminToken } from "@/lib/adminToken";
import { SharedProps, Booking } from "@/app/admin/page";
import { Search, X, ChevronDown, Mail, Calendar, DollarSign, FileText, RefreshCw, Check, Inbox, Copy, Loader2, Power } from "lucide-react";
import { useProperty } from '@/components/PropertyProvider';
import { SOURCE_LABELS, type BookingSource } from "@/lib/attribution";

function nightsBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function fmt(d: string, opts?: Intl.DateTimeFormatOptions) {
    return new Date(d).toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
    requested: "bg-blue-100 text-blue-700 border-blue-200",
    paid:      "bg-green-100 text-green-700 border-green-200",
    pending:   "bg-amber-100 text-amber-700 border-amber-200",
    cancelled: "bg-red-100 text-red-600 border-red-200",
};

type FilterStatus = "all" | "requested" | "paid" | "pending" | "cancelled";

// ── Booking request actions ──────────────────────────────────────────────────
// Requests are taken while online checkout is paused. They hold no dates, so
// approval goes through its own endpoint, which re-checks the calendar before
// holding the dates and creating the guest's Stripe payment link.
type ApprovalResult = { paymentUrl: string | null; emailed: boolean; expiresAt: string };

async function approveRequest(id: string): Promise<ApprovalResult> {
    const res = await fetch(`/api/admin/bookings/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAdminToken() ?? ""}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to approve request");
    return data;
}

async function declineRequest(id: string): Promise<void> {
    const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken() ?? ""}` },
        body: JSON.stringify({ status: "cancelled" }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to decline request");
    }
}

/** Shown after approval so the link can be texted if the email didn't go out. */
function PaymentLinkNotice({ result, onDismiss, addToast }: {
    result: ApprovalResult & { guestName: string };
    onDismiss: () => void;
    addToast: SharedProps["addToast"];
}) {
    const copy = async () => {
        if (!result.paymentUrl) return;
        try {
            await navigator.clipboard.writeText(result.paymentUrl);
            addToast("Payment link copied", "success");
        } catch {
            addToast("Couldn't copy — select the link and copy it manually", "error");
        }
    };
    return (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2" role="status">
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-green-800">
                    Approved {result.guestName}. {result.emailed
                        ? "The payment link was emailed to them."
                        : "The email didn't send — share this link with them yourself."}
                </p>
                <button onClick={onDismiss} aria-label="Dismiss" className="p-1 rounded-lg hover:bg-green-100 text-green-700">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <p className="text-xs text-green-700">
                Dates are held until {fmt(result.expiresAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Once they pay, the booking turns Paid and stays on the calendar.
            </p>
            {result.paymentUrl && (
                <div className="flex gap-2">
                    <input readOnly value={result.paymentUrl} onFocus={e => e.currentTarget.select()}
                        className="flex-1 min-w-0 text-xs font-mono bg-white border border-green-200 rounded-lg px-2 py-2" aria-label="Payment link" />
                    <button onClick={copy} className="shrink-0 flex items-center gap-1 px-3 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800">
                        <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                </div>
            )}
        </div>
    );
}

/** Online checkout on/off switch. Off = the booking modal takes requests instead. */
type GateState = {
    ready: boolean;
    items: { id: string; label: string; ok: boolean; fix: string }[];
    switchedOn: boolean;
    live: boolean;
    contactPhone: string;
};

function CheckoutSwitch({ addToast }: { addToast: SharedProps["addToast"] }) {
    const [gate, setGate]     = useState<GateState | null>(null);
    const [failed, setFailed] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = () =>
        fetch("/api/admin/launch-gate")
            .then(r => (r.ok ? r.json() : Promise.reject()))
            .then(setGate)
            .catch(() => setFailed(true));

    useEffect(() => { load(); }, []);

    const toggle = async () => {
        if (!gate) return;
        const next = !gate.switchedOn;
        if (next && !window.confirm("Turn online checkout on? Guests will be able to pay with Stripe immediately.")) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/content", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken() ?? ""}` },
                body: JSON.stringify({
                    key: "online_checkout_enabled", value: String(next),
                    label: "Online Checkout Enabled", type: "text", section: "booking", category: "settings",
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to update checkout setting");
            addToast(next ? "Online checkout is live" : "Online checkout paused", "success");
        } catch (err: any) {
            addToast(err?.message || "Failed to update checkout setting", "error");
        } finally {
            setSaving(false);
            load();
        }
    };

    const live = gate?.live ?? false;
    const missing = gate?.items.filter(i => !i.ok) ?? [];
    // Switched on but held by the gate, e.g. the Stripe account lost the ability to take charges.
    const held = Boolean(gate?.switchedOn && !gate.ready);

    return (
        <div className={`rounded-2xl border p-4 space-y-3 ${live ? "bg-white border-gray-100" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex items-center gap-3">
                <Power className={`w-5 h-5 shrink-0 ${live ? "text-green-600" : "text-amber-600"}`} aria-hidden />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                        Online checkout: {failed ? "unknown" : !gate ? "…" : live ? "Live" : held ? "Paused until setup is complete" : "Paused"}
                    </p>
                    <p className="text-xs text-gray-500">
                        {live
                            ? "Guests pay with Stripe when they book."
                            : `Guests see a maintenance message with ${gate?.contactPhone || "your phone number"}. Their requests appear below for you to approve.`}
                    </p>
                </div>
                {gate && (gate.switchedOn || gate.ready) && (
                    <button onClick={toggle} disabled={saving}
                        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50 ${
                            gate.switchedOn ? "border border-gray-200 text-gray-700 hover:bg-gray-50" : "bg-brand-gold text-white hover:bg-yellow-600"
                        }`}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Saving" /> : gate.switchedOn ? "Pause" : "Turn on"}
                    </button>
                )}
            </div>

            {gate && !gate.ready && (
                <div className="border-t border-amber-200 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-900">Before guests can pay online:</p>
                    <ul className="space-y-1.5">
                        {gate.items.map(item => (
                            <li key={item.id} className="flex items-start gap-2 text-xs">
                                <span className={`mt-0.5 w-4 h-4 shrink-0 rounded-full flex items-center justify-center ${item.ok ? "bg-emerald-100 text-emerald-700" : "bg-white border border-amber-300 text-amber-700"}`} aria-hidden>
                                    {item.ok ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                                </span>
                                <span className={item.ok ? "text-gray-500" : "text-gray-800"}>
                                    {item.label}
                                    <span className="sr-only">{item.ok ? " — done" : " — missing"}</span>
                                    {!item.ok && <span className="text-gray-500"> — {item.fix}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-amber-800">{missing.length} step{missing.length === 1 ? "" : "s"} left. You can keep approving requests meanwhile.</p>
                </div>
            )}
        </div>
    );
}

/** Approve / Decline pair, used in the requests list and in the drawer. */
function RequestButtons({ booking, busy, onApprove, onDecline, size = "sm" }: {
    booking: Booking;
    busy: boolean;
    onApprove: (b: Booking) => void;
    onDecline: (b: Booking) => void;
    size?: "sm" | "md";
}) {
    const pad = size === "md" ? "py-2.5 rounded-xl text-sm" : "py-2 rounded-lg text-xs";
    return (
        <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onApprove(booking)} disabled={busy}
                className={`${pad} font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50`}>
                {busy ? "Working…" : "Approve & send link"}
            </button>
            <button onClick={() => onDecline(booking)} disabled={busy}
                className={`${pad} font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50`}>
                Decline
            </button>
        </div>
    );
}

// ── Booking detail drawer ────────────────────────────────────────────────────
function BookingDrawer({ booking, onClose, onStatusChange, onApprove, onDecline, busyId, addToast }: {
    booking: Booking;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
    onApprove: (b: Booking) => void;
    onDecline: (b: Booking) => void;
    busyId: string | null;
    addToast: SharedProps["addToast"];
}) {
    const property = useProperty();
    const nights = nightsBetween(booking.startDate, booking.endDate);
    const [updating, setUpdating] = useState(false);
    const [status, setStatus]    = useState(booking.status);

    const updateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            const token = getAdminToken() ?? "";
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
                        <Row icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Booked" value={booking.room ? booking.room.name : "Whole house"} />
                        {booking.source && booking.source !== "direct" && (
                            <Row icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Came from"
                                value={SOURCE_LABELS[booking.source as BookingSource] ?? booking.source} />
                        )}
                        {booking.guestCount ? <Row icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Guests" value={String(booking.guestCount)} /> : null}
                    </Card>

                    {/* Payment */}
                    <Card>
                        <Row icon={<DollarSign className="w-4 h-4 text-gray-400" />} label="Total" value={`$${booking.totalPrice.toFixed(2)}`} bold />
                        {(booking.occupancyTax ?? 0) + (booking.assessmentTax ?? 0) > 0 && (
                            <Row icon={<DollarSign className="w-4 h-4 text-gray-400" />} label="Occupancy tax (included)"
                                value={`$${((booking.occupancyTax ?? 0) + (booking.assessmentTax ?? 0)).toFixed(2)}`} />
                        )}
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
                        <p className="text-xs text-gray-400">
                            {status === "requested" ? "Requested" : "Booked"} {fmt(booking.createdAt, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                    )}
                </div>

                {/* Status actions */}
                <div className="p-4 border-t border-gray-100 space-y-2">
                    {status === "requested" ? (
                        <>
                            <p className="text-xs text-gray-500 mb-2">
                                This guest asked to book while online checkout was paused. Approving re-checks the dates, holds them, and emails the guest a Stripe payment link.
                            </p>
                            <RequestButtons booking={booking} busy={busyId === booking.id} onApprove={onApprove} onDecline={onDecline} size="md" />
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                    <a
                        href={`mailto:${booking.email}?subject=${encodeURIComponent(`Your Booking at ${property.name}`)}`}
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
    const [busyId, setBusyId]     = useState<string | null>(null);
    const [approval, setApproval] = useState<(ApprovalResult & { guestName: string }) | null>(null);

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

    // Soonest stay first: those are the ones that can't wait.
    const requests = useMemo(
        () => bookings
            .filter(b => b.status === "requested")
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
        [bookings]
    );

    const handleStatusChange = (id: string, status: string) => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as any } : b));
    };

    const handleApprove = async (b: Booking) => {
        setBusyId(b.id);
        try {
            const result = await approveRequest(b.id);
            handleStatusChange(b.id, "pending");
            setApproval({ ...result, guestName: b.guestName });
            setSelected(null);
            addToast(result.emailed ? "Approved — payment link emailed" : "Approved — share the payment link", "success");
        } catch (err: any) {
            addToast(err.message, "error");
        } finally {
            setBusyId(null);
        }
    };

    const handleDecline = async (b: Booking) => {
        if (!window.confirm(`Decline ${b.guestName}'s request? They'll get an email saying it was cancelled.`)) return;
        setBusyId(b.id);
        try {
            await declineRequest(b.id);
            handleStatusChange(b.id, "cancelled");
            setSelected(null);
            addToast("Request declined", "success");
        } catch (err: any) {
            addToast(err.message, "error");
        } finally {
            setBusyId(null);
        }
    };

    const counts = useMemo(() => ({
        all:       bookings.length,
        requested: bookings.filter(b => b.status === "requested").length,
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

            <CheckoutSwitch addToast={addToast} />

            {approval && (
                <PaymentLinkNotice result={approval} onDismiss={() => setApproval(null)} addToast={addToast} />
            )}

            {/* Booking requests awaiting approval */}
            {requests.length > 0 && (
                <section aria-labelledby="requests-heading" className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Inbox className="w-4 h-4 text-blue-600" />
                        <h2 id="requests-heading" className="text-sm font-semibold text-gray-900">
                            Booking requests ({requests.length})
                        </h2>
                    </div>
                    <p className="text-xs text-gray-500">
                        Guests who tried to book while checkout was paused. These dates are not held until you approve.
                    </p>
                    {requests.map(b => {
                        const nights = nightsBetween(b.startDate, b.endDate);
                        return (
                            <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
                                <button onClick={() => setSelected(b)} className="w-full text-left">
                                    <p className="font-semibold text-sm text-gray-900">{b.guestName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {b.room ? b.room.name : "Whole house"} · {fmt(b.startDate, { month: "short", day: "numeric" })} → {fmt(b.endDate, { month: "short", day: "numeric" })} · {nights} night{nights !== 1 ? "s" : ""}
                                        {b.guestCount ? ` · ${b.guestCount} guest${b.guestCount !== 1 ? "s" : ""}` : ""}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5 break-all">
                                        {b.email} · <span className="font-semibold text-gray-700">${b.totalPrice.toFixed(0)}</span>
                                    </p>
                                </button>
                                <RequestButtons booking={b} busy={busyId === b.id} onApprove={handleApprove} onDecline={handleDecline} />
                            </div>
                        );
                    })}
                </section>
            )}

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
                {(["all", "requested", "paid", "pending", "cancelled"] as FilterStatus[]).map(s => (
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
                    onApprove={handleApprove}
                    onDecline={handleDecline}
                    busyId={busyId}
                    addToast={addToast}
                />
            )}
        </div>
    );
}
