"use client";
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import {
    LayoutDashboard, Calendar, Users, Mail, TrendingUp, ExternalLink,
    Settings, LogOut, Search, Filter, Download, Plus, RefreshCw,
    DollarSign, Home, Clock, CheckCircle, XCircle, AlertCircle, Menu, X as CloseIcon
} from "lucide-react";

// Client components loaded dynamically
const BookingsTable = dynamic(() => import('@/components/admin/BookingsTable').then(m => m.BookingsTable), { ssr: false });
const CalendarView = dynamic(() => import('@/components/admin/CalendarView').then(m => m.CalendarView), { ssr: false });
const EmailPanel = dynamic(() => import('@/components/admin/EmailPanel').then(m => m.EmailPanel), { ssr: false });

type Booking = {
    id: string;
    startDate: string;
    endDate: string;
    guestName: string;
    email: string;
    totalPrice: number;
    status: string;
};

type Subscriber = {
    id: string;
    email: string;
    name?: string;
};

type Analytics = {
    totalBookings: number;
    totalRevenue: number;
    occupancyRate: number;
};

type ExternalBooking = {
    id: string;
    source: string;
    guestName: string;
    startDate: string;
    endDate: string;
    notes?: string;
};

type ICalFeed = {
    id: string;
    name: string;
    url: string;
    source: string;
    lastSync?: string;
};

type SchedulerStatus = {
    isRunning: boolean;
    nextRun: string | null;
};

export default function AdminPanel() {
    const [authenticated, setAuthenticated] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState("");
    const [activeTab, setActiveTab] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [externalBookings, setExternalBookings] = useState<ExternalBooking[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [showAddExternal, setShowAddExternal] = useState(false);
    const [newExternalBooking, setNewExternalBooking] = useState({
        source: "Airbnb",
        guestName: "",
        startDate: "",
        endDate: "",
        notes: "",
    });
    const [icalFeeds, setIcalFeeds] = useState<ICalFeed[]>([]);
    const [showAddIcal, setShowAddIcal] = useState(false);
    const [newIcalFeed, setNewIcalFeed] = useState({
        name: "",
        url: "",
        source: "Airbnb",
    });
    const [syncing, setSyncing] = useState(false);
    const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // Close sidebar on mobile by default
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setSidebarOpen(false);
        }

        const token = localStorage.getItem('admin_token');
        if (token) {
            fetch('/api/admin/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then((data) => {
                    if (data.user) {
                        setAuthenticated(true);
                        fetchData();
                    } else {
                        setAuthenticated(false);
                    }
                });
        }
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('admin_token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [bookingsRes, subscribersRes, externalRes, analyticsRes, icalRes, schedulerRes] = await Promise.all([
            fetch("/api/admin/bookings", { headers }),
            fetch("/api/admin/subscribers", { headers }),
            fetch("/api/admin/external-bookings", { headers }),
            fetch("/api/admin/analytics", { headers }),
            fetch("/api/admin/ical-feeds", { headers }),
            fetch("/api/admin/ical-feeds/scheduler", { method: "POST", headers }),
        ]);
        setBookings(await bookingsRes.json());
        setSubscribers(await subscribersRes.json());
        setExternalBookings(await externalRes.json());
        setAnalytics(await analyticsRes.json());
        setIcalFeeds(await icalRes.json());

        const schedulerData = await schedulerRes.json();
        setSchedulerStatus(schedulerData.status);
    };

    const handleLogin = async () => {
        try {
            const res = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem('admin_token', data.token);
                setAuthenticated(true);
                fetchData();
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (err) {
            console.error(err);
            alert('Login failed');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        setAuthenticated(false);
    };

    const upcomingBookings = bookings
        .filter(b => new Date(b.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 5);

    const recentBookings = bookings
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        .slice(0, 5);

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green to-brand-gold admin-root p-4">
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="text-center mb-6 sm:mb-8">
                        <Home className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-brand-gold mb-3 sm:mb-4" />
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Whistle Inn Admin</h1>
                        <p className="text-sm sm:text-base text-slate-600">Sign in to access your dashboard</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@whistleinn.com"
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent transition bg-white text-slate-900 touch-manipulation"
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent transition bg-white text-slate-900 touch-manipulation"
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>
                        <button
                            onClick={handleLogin}
                            className="w-full bg-brand-gold hover:bg-yellow-500 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg touch-manipulation min-h-[48px]"
                        >
                            Sign In
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-4 sm:mt-6">
                        Need help? Run <code className="bg-slate-100 px-2 py-1 rounded text-xs">node scripts/create_admin.js</code>
                    </p>
                </div>
            </div>
        );
    }

    const navItems = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "bookings", label: "Bookings", icon: Calendar },
        { id: "external", label: "External Sync", icon: ExternalLink },
        { id: "customers", label: "Customers", icon: Users },
        { id: "emails", label: "Email Center", icon: Mail },
        { id: "analytics", label: "Analytics", icon: TrendingUp },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex admin-root relative">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transition-transform duration-300 flex flex-col
                w-64 
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0
                ${sidebarOpen ? 'md:w-64' : 'md:w-20'}
            `}>
                <div className="p-6 flex items-center justify-between border-b border-slate-800">
                    {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 768)) && <h1 className="text-xl font-bold">Whistle Inn</h1>}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-slate-800 rounded-lg hidden md:block"
                    >
                        {sidebarOpen ? <CloseIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 hover:bg-slate-800 rounded-lg md:hidden"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                                ? 'bg-brand-gold text-white shadow-lg'
                                : 'hover:bg-slate-800 text-white'
                                }`}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className={`font-medium transition-all duration-200 ${
                                sidebarOpen ? 'opacity-100' : 'md:opacity-0 md:w-0 md:overflow-hidden'
                                }`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-600 transition-all text-white hover:text-white"
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <span className={`font-medium transition-all duration-200 ${
                            sidebarOpen ? 'opacity-100' : 'md:opacity-0 md:w-0 md:overflow-hidden'
                        }`}>
                            Logout
                        </span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full md:w-auto h-screen">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-6 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg touch-manipulation"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                                    {navItems.find(item => item.id === activeTab)?.label}
                                </h2>
                                <p className="text-slate-600 text-xs md:text-sm mt-1 hidden sm:block">
                                    {activeTab === "dashboard" && "Overview of your property performance"}
                                    {activeTab === "bookings" && "Manage and track all reservations"}
                                    {activeTab === "external" && "Sync with Airbnb, VRBO, and more"}
                                    {activeTab === "customers" && "View and manage customer data"}
                                    {activeTab === "emails" && "Send and manage email communications"}
                                    {activeTab === "analytics" && "Detailed insights and metrics"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition touch-manipulation"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="font-medium hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </header>

                <div className="p-4 md:p-8 space-y-6 pb-20 md:pb-8">
                    {/* Dashboard Tab */}
                    {activeTab === "dashboard" && analytics && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-blue-100 rounded-lg">
                                            <Calendar className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <span className="text-green-600 text-sm font-medium">+12%</span>
                                    </div>
                                    <h3 className="text-slate-600 text-sm font-medium">Total Bookings</h3>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{analytics.totalBookings}</p>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-green-100 rounded-lg">
                                            <DollarSign className="w-6 h-6 text-green-600" />
                                        </div>
                                        <span className="text-green-600 text-sm font-medium">+8%</span>
                                    </div>
                                    <h3 className="text-slate-600 text-sm font-medium">Total Revenue</h3>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">${analytics.totalRevenue.toLocaleString()}</p>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-purple-100 rounded-lg">
                                            <TrendingUp className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <span className="text-green-600 text-sm font-medium">+5%</span>
                                    </div>
                                    <h3 className="text-slate-600 text-sm font-medium">Occupancy Rate</h3>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{analytics.occupancyRate}%</p>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-yellow-100 rounded-lg">
                                            <Users className="w-6 h-6 text-yellow-600" />
                                        </div>
                                        <span className="text-green-600 text-sm font-medium">+15%</span>
                                    </div>
                                    <h3 className="text-slate-600 text-sm font-medium">Subscribers</h3>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{subscribers.length}</p>
                                </div>
                            </div>

                            {/* Upcoming Bookings & Recent Activity */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-slate-900">Upcoming Bookings</h3>
                                        <Clock className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="space-y-4">
                                        {upcomingBookings.length === 0 ? (
                                            <p className="text-slate-500 text-center py-8">No upcoming bookings</p>
                                        ) : (
                                            upcomingBookings.map((booking) => (
                                                <div key={booking.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                                    <div className="flex-1 min-w-0 mr-4">
                                                        <p className="font-semibold text-slate-900 truncate">{booking.guestName}</p>
                                                        <p className="text-sm text-slate-600 truncate">
                                                            {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="font-bold text-brand-gold">${booking.totalPrice}</p>
                                                        <span className={`text-xs px-2 py-1 rounded-full ${booking.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {booking.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-slate-900">Recent Bookings</h3>
                                        <AlertCircle className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="space-y-4">
                                        {recentBookings.length === 0 ? (
                                            <p className="text-slate-500 text-center py-8">No recent bookings</p>
                                        ) : (
                                            recentBookings.map((booking) => (
                                                <div key={booking.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                                    <div className={`p-2 rounded-lg flex-shrink-0 ${booking.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                                                        }`}>
                                                        {booking.status === 'paid' ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                                        ) : (
                                                            <Clock className="w-5 h-5 text-yellow-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-slate-900 truncate">{booking.guestName}</p>
                                                        <p className="text-sm text-slate-600 truncate">{booking.email}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="font-bold text-slate-900">${booking.totalPrice}</p>
                                                        <p className="text-xs text-slate-500">{new Date(booking.startDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-gradient-to-r from-brand-gold to-brand-green rounded-xl shadow-lg p-6 text-white">
                                <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button
                                        onClick={() => setActiveTab("bookings")}
                                        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
                                    >
                                        <Calendar className="w-6 h-6 mb-2" />
                                        <p className="font-semibold">View All Bookings</p>
                                        <p className="text-sm opacity-90">Manage reservations</p>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("external")}
                                        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
                                    >
                                        <RefreshCw className="w-6 h-6 mb-2" />
                                        <p className="font-semibold">Sync Calendars</p>
                                        <p className="text-sm opacity-90">Update external bookings</p>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("emails")}
                                        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
                                    >
                                        <Mail className="w-6 h-6 mb-2" />
                                        <p className="font-semibold">Send Email</p>
                                        <p className="text-sm opacity-90">Contact guests</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bookings Tab */}
                    {activeTab === "bookings" && (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="relative w-full md:w-auto md:flex-1 md:max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search bookings..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                    />
                                </div>
                                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition whitespace-nowrap touch-manipulation">
                                        <Filter className="w-4 h-4" />
                                        Filter
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition whitespace-nowrap touch-manipulation">
                                        <Download className="w-4 h-4" />
                                        Export
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                                <BookingsTable />
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Calendar View</h3>
                                <CalendarView />
                            </div>
                        </div>
                    )}

                    {/* External Bookings Tab */}
                    {activeTab === "external" && (
                        <div className="space-y-6">
                            {/* Scheduler Status Banner */}
                            {schedulerStatus && (
                                <div className={`rounded-xl p-4 flex items-center gap-4 ${schedulerStatus.isRunning ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                    }`}>
                                    <div className={`w-3 h-3 rounded-full ${schedulerStatus.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">
                                            Auto-sync: {schedulerStatus.isRunning ? 'Active' : 'Inactive'}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            {schedulerStatus.isRunning ? 'iCal feeds are syncing every 30 minutes' : 'Automatic sync is not running'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setSyncing(true);
                                            await fetch("/api/admin/ical-feeds/sync", { method: "POST" });
                                            setSyncing(false);
                                            fetchData();
                                        }}
                                        disabled={syncing}
                                        className="flex items-center gap-2 px-4 py-2 bg-brand-gold hover:bg-yellow-500 text-white rounded-lg transition disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                        {syncing ? 'Syncing...' : 'Sync Now'}
                                    </button>
                                </div>
                            )}

                            {/* iCal Feeds Section */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">iCal Calendar Feeds</h3>
                                        <p className="text-sm text-slate-600">Connect external booking platforms</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddIcal(!showAddIcal)}
                                        className="flex items-center gap-2 px-4 py-2 bg-brand-gold hover:bg-yellow-500 text-white rounded-lg transition"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Feed
                                    </button>
                                </div>

                                {showAddIcal && (
                                    <div className="mb-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
                                        <h4 className="font-semibold text-slate-900 mb-4">Add New iCal Feed</h4>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <input
                                                type="text"
                                                placeholder="Feed Name (e.g., Airbnb Main)"
                                                value={newIcalFeed.name}
                                                onChange={(e) => setNewIcalFeed({ ...newIcalFeed, name: e.target.value })}
                                                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                            />
                                            <select
                                                value={newIcalFeed.source}
                                                onChange={(e) => setNewIcalFeed({ ...newIcalFeed, source: e.target.value })}
                                                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                            >
                                                <option value="Airbnb">Airbnb</option>
                                                <option value="VRBO">VRBO</option>
                                                <option value="Booking.com">Booking.com</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <input
                                            type="url"
                                            placeholder="iCal URL (ends with .ics)"
                                            value={newIcalFeed.url}
                                            onChange={(e) => setNewIcalFeed({ ...newIcalFeed, url: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent mb-4"
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={async () => {
                                                    await fetch("/api/admin/ical-feeds", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify(newIcalFeed),
                                                    });
                                                    setShowAddIcal(false);
                                                    setNewIcalFeed({ name: "", url: "", source: "Airbnb" });
                                                    fetchData();
                                                }}
                                                className="px-4 py-2 bg-brand-gold hover:bg-yellow-500 text-white rounded-lg transition"
                                            >
                                                Add Feed
                                            </button>
                                            <button
                                                onClick={() => setShowAddIcal(false)}
                                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {icalFeeds.length === 0 ? (
                                        <div className="text-center py-12">
                                            <ExternalLink className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                            <p className="text-slate-600">No iCal feeds configured yet</p>
                                            <p className="text-sm text-slate-500">Add a feed to sync external bookings</p>
                                        </div>
                                    ) : (
                                        icalFeeds.map((feed) => (
                                            <div key={feed.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                        <ExternalLink className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{feed.name}</p>
                                                        <p className="text-sm text-slate-600">
                                                            Source: {feed.source}
                                                            {feed.lastSync && (
                                                                <span className="ml-2 text-slate-400">
                                                                    • Last synced {new Date(feed.lastSync).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Remove this feed?')) {
                                                            await fetch(`/api/admin/ical-feeds/${feed.id}`, { method: "DELETE" });
                                                            fetchData();
                                                        }
                                                    }}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Manual External Bookings */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Manual External Bookings</h3>
                                        <p className="text-sm text-slate-600">Add bookings that aren't synced via iCal</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddExternal(!showAddExternal)}
                                        className="flex items-center gap-2 px-4 py-2 bg-brand-green hover:bg-green-600 text-white rounded-lg transition"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Manual Booking
                                    </button>
                                </div>

                                {showAddExternal && (
                                    <div className="mb-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
                                        <h4 className="font-semibold text-slate-900 mb-4">New External Booking</h4>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <select
                                                value={newExternalBooking.source}
                                                onChange={(e) => setNewExternalBooking({ ...newExternalBooking, source: e.target.value })}
                                                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                            >
                                                <option value="Airbnb">Airbnb</option>
                                                <option value="VRBO">VRBO</option>
                                                <option value="Booking.com">Booking.com</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Guest Name"
                                                value={newExternalBooking.guestName}
                                                onChange={(e) => setNewExternalBooking({ ...newExternalBooking, guestName: e.target.value })}
                                                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                            />
                                            <input
                                                type="date"
                                                value={newExternalBooking.startDate}
                                                onChange={(e) => setNewExternalBooking({ ...newExternalBooking, startDate: e.target.value })}
                                                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                            />
                                            <input
                                                type="date"
                                                value={newExternalBooking.endDate}
                                                onChange={(e) => setNewExternalBooking({ ...newExternalBooking, endDate: e.target.value })}
                                                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                            />
                                        </div>
                                        <textarea
                                            placeholder="Notes (optional)"
                                            value={newExternalBooking.notes}
                                            onChange={(e) => setNewExternalBooking({ ...newExternalBooking, notes: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent mb-4"
                                            rows={3}
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={async () => {
                                                    await fetch("/api/admin/external-bookings", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify(newExternalBooking),
                                                    });
                                                    setShowAddExternal(false);
                                                    setNewExternalBooking({ source: "Airbnb", guestName: "", startDate: "", endDate: "", notes: "" });
                                                    fetchData();
                                                }}
                                                className="px-4 py-2 bg-brand-green hover:bg-green-600 text-white rounded-lg transition"
                                            >
                                                Save Booking
                                            </button>
                                            <button
                                                onClick={() => setShowAddExternal(false)}
                                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Source</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Guest</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Check-in</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Check-out</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {externalBookings.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-12 text-slate-500">
                                                        No external bookings yet
                                                    </td>
                                                </tr>
                                            ) : (
                                                externalBookings.map((b) => (
                                                    <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="py-3 px-4">
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                                                {b.source}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 font-medium text-slate-900">{b.guestName}</td>
                                                        <td className="py-3 px-4 text-slate-600">{new Date(b.startDate).toLocaleDateString()}</td>
                                                        <td className="py-3 px-4 text-slate-600">{new Date(b.endDate).toLocaleDateString()}</td>
                                                        <td className="py-3 px-4 text-slate-600">{b.notes || "—"}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Customers Tab */}
                    {activeTab === "customers" && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Newsletter Subscribers</h3>
                                    <p className="text-sm text-slate-600">{subscribers.length} total subscribers</p>
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-brand-gold hover:bg-yellow-500 text-white rounded-lg transition">
                                    <Download className="w-4 h-4" />
                                    Export List
                                </button>
                            </div>
                            <div className="space-y-2">
                                {subscribers.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-600">No subscribers yet</p>
                                    </div>
                                ) : (
                                    subscribers.map((s) => (
                                        <div key={s.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="w-10 h-10 bg-brand-gold rounded-full flex items-center justify-center text-white font-bold">
                                                {s.name ? s.name.charAt(0).toUpperCase() : s.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{s.name || 'Anonymous'}</p>
                                                <p className="text-sm text-slate-600">{s.email}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Emails Tab */}
                    {activeTab === "emails" && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <EmailPanel />
                        </div>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === "analytics" && analytics && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-blue-100 rounded-lg">
                                            <Calendar className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-slate-600 text-sm font-medium">Total Bookings</h3>
                                            <p className="text-3xl font-bold text-slate-900">{analytics.totalBookings}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-green-600 font-medium">↑ 12% from last month</p>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-green-100 rounded-lg">
                                            <DollarSign className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-slate-600 text-sm font-medium">Total Revenue</h3>
                                            <p className="text-3xl font-bold text-slate-900">${analytics.totalRevenue.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-green-600 font-medium">↑ 8% from last month</p>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-purple-100 rounded-lg">
                                            <TrendingUp className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-slate-600 text-sm font-medium">Occupancy Rate</h3>
                                            <p className="text-3xl font-bold text-slate-900">{analytics.occupancyRate}%</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-green-600 font-medium">↑ 5% from last month</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue Trends</h3>
                                <div className="h-64 flex items-center justify-center text-slate-500">
                                    <p>Chart visualization would go here</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Booking Sources</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm text-slate-600">Direct Bookings</span>
                                                <span className="text-sm font-semibold text-slate-900">{bookings.length}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div className="bg-brand-gold h-2 rounded-full" style={{ width: '60%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm text-slate-600">External Platforms</span>
                                                <span className="text-sm font-semibold text-slate-900">{externalBookings.length}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div className="bg-brand-green h-2 rounded-full" style={{ width: '40%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Key Metrics</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Average Booking Value</span>
                                            <span className="font-bold text-slate-900">
                                                ${bookings.length > 0 ? Math.round(bookings.reduce((sum, b) => sum + b.totalPrice, 0) / bookings.length) : 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Average Stay Length</span>
                                            <span className="font-bold text-slate-900">4.2 nights</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Total Guests</span>
                                            <span className="font-bold text-slate-900">{bookings.length * 3} (est.)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
