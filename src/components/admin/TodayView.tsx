"use client";
import { useMemo } from "react";
import { SharedProps, Booking } from "@/app/admin/page";
import {
    ArrowRight, LogOut as CheckOutIcon, LogIn as CheckInIcon,
    CalendarDays, DollarSign, Home, TrendingUp, RefreshCw,
    AlertCircle, Clock, CheckCircle
} from "lucide-react";

type Props = SharedProps & { setTab: (t: any) => void };

function nightsBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function fmt(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        paid:      "bg-green-100 text-green-700",
        pending:   "bg-amber-100 text-amber-700",
        cancelled: "bg-red-100 text-red-600",
    };
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
            {status}
        </span>
    );
}

function BookingCard({ booking, label }: { booking: Booking; label: string }) {
    const nights = nightsBetween(booking.startDate, booking.endDate);
    return (
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0">
                <span className="text-brand-gold font-bold text-sm">{booking.guestName[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{booking.guestName}</p>
                    <StatusPill status={booking.status} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                    {label} · {nights} night{nights !== 1 ? "s" : ""} · ${booking.totalPrice.toFixed(0)}
                </p>
            </div>
        </div>
    );
}

export function TodayView({ bookings, analytics, refreshData, dataLoading, setTab }: Props) {
    const today = useMemo(() => {
        const d = new Date(); d.setHours(0,0,0,0); return d;
    }, []);

    const { checkIns, checkOuts, active, upcoming, pendingCount } = useMemo(() => {
        const todayStr = today.toISOString().split("T")[0];
        const checkIns:  Booking[] = [];
        const checkOuts: Booking[] = [];
        const active:    Booking[] = [];
        const upcoming:  Booking[] = [];
        let pendingCount = 0;

        for (const b of bookings) {
            if (b.status === "cancelled") continue;
            if (b.status === "pending") pendingCount++;
            const start = b.startDate.split("T")[0];
            const end   = b.endDate.split("T")[0];
            if (start === todayStr) checkIns.push(b);
            if (end   === todayStr) checkOuts.push(b);
            if (start <= todayStr && end > todayStr) active.push(b);
            if (start > todayStr) upcoming.push(b);
        }
        upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        return { checkIns, checkOuts, active, upcoming: upcoming.slice(0, 5), pendingCount };
    }, [bookings, today]);

    const todayName = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const isOccupied = active.length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Today</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{todayName}</p>
                </div>
                <button
                    onClick={refreshData} disabled={dataLoading}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Property status banner */}
            <div className={`rounded-2xl p-4 flex items-center gap-3 ${
                isOccupied
                    ? "bg-brand-gold/10 border border-brand-gold/20"
                    : "bg-green-50 border border-green-100"
            }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isOccupied ? "bg-brand-gold" : "bg-green-500"
                }`}>
                    <Home className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="font-semibold text-sm text-gray-900">
                        {isOccupied ? `Occupied · ${active[0].guestName} is staying` : "Property is available"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {isOccupied
                            ? `Checking out ${fmt(active[0].endDate)}`
                            : upcoming.length > 0
                                ? `Next guest arrives ${fmt(upcoming[0].startDate)}`
                                : "No upcoming bookings"}
                    </p>
                </div>
            </div>

            {/* Pending alert */}
            {pendingCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-800 flex-1">
                        <span className="font-semibold">{pendingCount} booking{pendingCount > 1 ? "s" : ""}</span> waiting for payment confirmation
                    </p>
                    <button onClick={() => setTab("reservations")} className="text-xs font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1">
                        View <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    label="Total Revenue"
                    value={`$${(analytics?.totalRevenue ?? 0).toLocaleString()}`}
                    icon={<DollarSign className="w-4 h-4" />}
                    color="text-green-600"
                    bg="bg-green-50"
                />
                <StatCard
                    label="Bookings"
                    value={String(analytics?.totalBookings ?? 0)}
                    icon={<CalendarDays className="w-4 h-4" />}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    label="Occupancy"
                    value={`${Math.round(analytics?.occupancyRate ?? 0)}%`}
                    icon={<TrendingUp className="w-4 h-4" />}
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
                <StatCard
                    label="Active Now"
                    value={String(active.length)}
                    icon={<Home className="w-4 h-4" />}
                    color="text-brand-gold"
                    bg="bg-amber-50"
                />
            </div>

            {/* Today's activity */}
            {(checkIns.length > 0 || checkOuts.length > 0) && (
                <Section title="Today's Activity">
                    {checkIns.map(b => (
                        <div key={b.id} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <CheckInIcon className="w-3 h-3 text-green-600" />
                            </div>
                            <BookingCard booking={b} label="Check-in" />
                        </div>
                    ))}
                    {checkOuts.map(b => (
                        <div key={b.id} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                <CheckOutIcon className="w-3 h-3 text-orange-600" />
                            </div>
                            <BookingCard booking={b} label="Check-out" />
                        </div>
                    ))}
                </Section>
            )}

            {/* Upcoming reservations */}
            <Section title="Upcoming Reservations" action={{ label: "View all", onClick: () => setTab("reservations") }}>
                {upcoming.length === 0 ? (
                    <EmptyState icon={<CalendarDays className="w-8 h-8 text-gray-300" />} text="No upcoming bookings" />
                ) : (
                    upcoming.map(b => {
                        const nights = nightsBetween(b.startDate, b.endDate);
                        const daysAway = Math.round((new Date(b.startDate).getTime() - today.getTime()) / 86400000);
                        return (
                            <div key={b.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0">
                                    <span className="text-brand-gold font-bold text-sm">{b.guestName[0].toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{b.guestName}</p>
                                        <StatusPill status={b.status} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {fmt(b.startDate)} → {fmt(b.endDate)} · {nights} nights · ${b.totalPrice.toFixed(0)}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-semibold text-gray-700">
                                        {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `${daysAway}d`}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </Section>
        </div>
    );
}

function StatCard({ label, value, icon, color, bg }: { label: string; value: string; icon: React.ReactNode; color: string; bg: string }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center ${color} mb-3`}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
    );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: { label: string; onClick: () => void } }) {
    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                {action && (
                    <button onClick={action.onClick} className="text-xs text-brand-gold font-medium flex items-center gap-0.5 hover:text-yellow-600">
                        {action.label} <ArrowRight className="w-3 h-3" />
                    </button>
                )}
            </div>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            {icon}
            <p className="text-sm text-gray-400 mt-2">{text}</p>
        </div>
    );
}
