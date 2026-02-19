"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ToastProvider, useToast } from "@/components/ui/toast-context";
import {
    LayoutDashboard, CalendarDays, DollarSign, Settings, List,
    LogOut, RefreshCw, Home
} from "lucide-react";

// ─── View components (lazy-loaded) ───────────────────────────────────────────
const TodayView       = dynamic(() => import('@/components/admin/TodayView').then(m => m.TodayView), { ssr: false });
const ReservationsView = dynamic(() => import('@/components/admin/ReservationsView').then(m => m.ReservationsView), { ssr: false });
const CalendarView    = dynamic(() => import('@/components/admin/CalendarView').then(m => m.CalendarView), { ssr: false });
const EarningsView    = dynamic(() => import('@/components/admin/EarningsView').then(m => m.EarningsView), { ssr: false });
const SettingsView    = dynamic(() => import('@/components/admin/SettingsView').then(m => m.SettingsView), { ssr: false });

// ─── Shared types (exported for sub-components) ───────────────────────────────
export type Booking = {
    id: string;
    startDate: string;
    endDate: string;
    guestName: string;
    email: string;
    totalPrice: number;
    status: string;
    createdAt?: string;
    notes?: string;
    guestCount?: number;
    discount?: number;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
};

export type Analytics = {
    totalBookings: number;
    totalRevenue: number;
    occupancyRate: number;
    monthlyRevenue?: { month: string; revenue: number }[];
};

export type SharedProps = {
    bookings: Booking[];
    analytics: Analytics | null;
    refreshData: () => Promise<void>;
    dataLoading: boolean;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

// ─── Nav tabs ────────────────────────────────────────────────────────────────
type TabId = "today" | "reservations" | "calendar" | "earnings" | "settings";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "today",        label: "Today",        icon: Home },
    { id: "reservations", label: "Reservations",  icon: List },
    { id: "calendar",     label: "Calendar",      icon: CalendarDays },
    { id: "earnings",     label: "Earnings",      icon: DollarSign },
    { id: "settings",     label: "Settings",      icon: Settings },
];

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
    return (
        <ToastProvider>
            <AdminPanelContent />
        </ToastProvider>
    );
}

// ─── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
    const { addToast } = useToast();
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading]   = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/admin/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Login failed");
            localStorage.setItem("adminToken", data.token);
            onLogin(data.token);
        } catch (err: unknown) {
            addToast(err instanceof Error ? err.message : "Login failed", "error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gold mb-4">
                        <Home className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Whistle Inn</h1>
                    <p className="text-slate-400 mt-1 text-sm">Host Dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            placeholder="admin@example.com"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-brand-gold text-white font-semibold hover:bg-yellow-600 transition disabled:opacity-50"
                    >
                        {loading ? "Signing in…" : "Sign In"}
                    </button>
                    <div className="text-center">
                        <a href="/admin/reset-password" className="text-xs text-slate-400 hover:text-brand-gold transition">
                            Forgot password?
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
function AdminPanelContent() {
    const { addToast } = useToast();
    const [token, setToken]           = useState<string | null>(null);
    const [activeTab, setActiveTab]   = useState<TabId>("today");
    const [bookings, setBookings]     = useState<Booking[]>([]);
    const [analytics, setAnalytics]   = useState<Analytics | null>(null);
    const [dataLoading, setDataLoading] = useState(false);

    // Restore token from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("adminToken");
        if (stored) setToken(stored);
    }, []);

    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const refreshData = useCallback(async () => {
        if (!token) return;
        setDataLoading(true);
        try {
            const [bookingsRes, analyticsRes] = await Promise.all([
                fetch("/api/admin/bookings", { headers }),
                fetch("/api/admin/analytics", { headers }),
            ]);
            if (bookingsRes.status === 401 || analyticsRes.status === 401) {
                localStorage.removeItem("adminToken");
                setToken(null);
                return;
            }
            setBookings(await bookingsRes.json());
            setAnalytics(await analyticsRes.json());
        } catch {
            addToast("Failed to load data", "error");
        } finally {
            setDataLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        if (token) refreshData();
    }, [token, refreshData]);

    function handleLogout() {
        localStorage.removeItem("adminToken");
        setToken(null);
        setBookings([]);
        setAnalytics(null);
    }

    if (!token) return <LoginScreen onLogin={setToken} />;

    const sharedProps: SharedProps = { bookings, analytics, refreshData, dataLoading, addToast };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top bar */}
            <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-gold flex items-center justify-center">
                        <Home className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm">Whistle Inn</span>
                </div>
                <div className="flex items-center gap-2">
                    {dataLoading && (
                        <RefreshCw className="w-4 h-4 text-brand-gold animate-spin" />
                    )}
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                        title="Sign out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto pb-24 md:pb-6 md:flex">
                {/* Desktop sidebar */}
                <nav className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-gray-100 md:bg-white md:sticky md:top-[57px] md:h-[calc(100vh-57px)] p-3 gap-1">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition w-full text-left ${
                                    active
                                        ? "bg-brand-gold text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Tab content */}
                <div className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
                    {activeTab === "today" && (
                        <TodayView {...sharedProps} setTab={setActiveTab} />
                    )}
                    {activeTab === "reservations" && (
                        <ReservationsView {...sharedProps} />
                    )}
                    {activeTab === "calendar" && (
                        <CalendarView />
                    )}
                    {activeTab === "earnings" && (
                        <EarningsView {...sharedProps} />
                    )}
                    {activeTab === "settings" && (
                        <SettingsView addToast={addToast} />
                    )}
                </div>
            </main>

            {/* Mobile bottom tab bar */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40 flex">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition ${
                                active ? "text-brand-gold" : "text-gray-400"
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${active ? "text-brand-gold" : "text-gray-400"}`} />
                            <span className="leading-none">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
