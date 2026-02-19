"use client";
import { useMemo } from "react";
import { SharedProps } from "@/app/admin/page";
import { DollarSign, TrendingUp, Calendar, RefreshCw } from "lucide-react";

export function EarningsView({ bookings, analytics, refreshData, dataLoading }: SharedProps) {
    const paid = useMemo(() => bookings.filter(b => b.status === "paid"), [bookings]);

    const thisMonth = useMemo(() => {
        const now = new Date();
        return paid
            .filter(b => {
                const d = new Date(b.startDate);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, b) => sum + b.totalPrice, 0);
    }, [paid]);

    const lastMonth = useMemo(() => {
        const now = new Date();
        const lm  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return paid
            .filter(b => {
                const d = new Date(b.startDate);
                return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
            })
            .reduce((sum, b) => sum + b.totalPrice, 0);
    }, [paid]);

    const monthlyData = analytics?.monthlyRevenue ?? [];
    const maxRev = Math.max(...monthlyData.map(m => m.revenue), 1);

    // Recent paid bookings (last 10)
    const recentPaid = useMemo(() =>
        [...paid]
            .sort((a, b) => new Date(b.createdAt ?? b.startDate).getTime() - new Date(a.createdAt ?? a.startDate).getTime())
            .slice(0, 10),
        [paid]
    );

    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">Earnings</h1>
                <button onClick={refreshData} disabled={dataLoading}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition">
                    <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Top stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Total Earnings</p>
                    <p className="text-3xl font-bold text-gray-900">
                        ${(analytics?.totalRevenue ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">from {paid.length} paid booking{paid.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                        <DollarSign className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">${thisMonth.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-gray-400 mt-0.5">This month</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-3">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        {growth !== null
                            ? <span className={growth >= 0 ? "text-green-600" : "text-red-500"}>{growth >= 0 ? "+" : ""}{growth.toFixed(0)}%</span>
                            : "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">vs last month</p>
                </div>
            </div>

            {/* Revenue chart */}
            {monthlyData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Revenue</h2>
                    <div className="flex items-end gap-1.5 h-32">
                        {monthlyData.map((m) => {
                            const pct = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0;
                            const isCurrentMonth = m.month === new Date().toISOString().slice(0,7);
                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                        ${m.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                                    </div>
                                    <div
                                        className={`w-full rounded-t-lg transition-all ${isCurrentMonth ? "bg-brand-gold" : "bg-brand-gold/30 group-hover:bg-brand-gold/50"}`}
                                        style={{ height: `${Math.max(pct, m.revenue > 0 ? 4 : 0)}%` }}
                                    />
                                    <p className="text-[9px] text-gray-400 truncate w-full text-center">
                                        {m.month.slice(5)} {/* MM */}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Occupancy */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-900">Occupancy Rate</h2>
                    <span className="text-sm font-bold text-gray-900">{Math.round(analytics?.occupancyRate ?? 0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                        className="h-2 rounded-full bg-brand-gold transition-all"
                        style={{ width: `${Math.min(analytics?.occupancyRate ?? 0, 100)}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-2">Based on booked nights over the past year</p>
            </div>

            {/* Recent transactions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Payments</h2>
                {recentPaid.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No payments yet</p>
                ) : (
                    <div className="space-y-3">
                        {recentPaid.map(b => (
                            <div key={b.id} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                    <DollarSign className="w-3.5 h-3.5 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{b.guestName}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(b.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} →{" "}
                                        {new Date(b.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </p>
                                </div>
                                <p className="text-sm font-semibold text-green-600 shrink-0">
                                    +${b.totalPrice.toFixed(0)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
