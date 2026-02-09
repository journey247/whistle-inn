"use client";
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import {
    LayoutDashboard, Calendar, Users, Mail, TrendingUp, ExternalLink,
    Settings, LogOut, Search, Filter, Download, Plus, RefreshCw,
    DollarSign, Home, Clock, CheckCircle, XCircle, AlertCircle
} from "lucide-react";

// Client components loaded dynamically to avoid SSR issues
const BookingsTable = dynamic(() => import('@/components/admin/BookingsTable').then(m => m.BookingsTable), { ssr: false });
const CalendarView = dynamic(() => import('@/components/admin/CalendarView').then(m => m.CalendarView), { ssr: false });
const SmsPanel = dynamic(() => import('@/components/admin/SmsPanel').then(m => m.SmsPanel), { ssr: false });
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
    const [activeTab, setActiveTab] = useState("bookings");
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
    const [emailTo, setEmailTo] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");

    // On mount, check token and verify
    useEffect(() => {
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
            fetch("/api/admin/ical-feeds/scheduler", { method: "POST", headers }), // Start scheduler
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

    const sendEmail = async () => {
        await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
        });
        alert("Email sent!");
    };

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900 admin-root">
                <div className="bg-white p-6 rounded shadow w-full max-w-md">
                    <h1 className="text-2xl mb-4">Admin Login</h1>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full p-2 border rounded mb-3 text-gray-900"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full p-2 border rounded mb-4 text-gray-900"
                    />
                    <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded w-full">Login</button>
                    <p className="text-xs text-gray-500 mt-3">Need help? Use the admin onboarding steps in the README.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6 text-gray-900 admin-root">
            <h1 className="text-3xl font-bold mb-6">Whistle Inn Admin Panel</h1>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6">
                {["bookings", "external", "customers", "emails", "analytics"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded ${activeTab === tab ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Bookings Tab */}
            {activeTab === "bookings" && (
                <div className="mb-6">
                    <h2 className="text-2xl mb-4">Bookings</h2>
                    <div className="mb-4">
                        <a href="#" className="text-sm text-blue-500">Export CSV</a>
                    </div>

                    <div className="mb-4">
                        <div className="bg-white rounded shadow p-4">
                            {/* Use client component for table */}
                            <BookingsTable />
                        </div>
                    </div>

                    <div className="mb-6">
                        <CalendarView />
                    </div>
                </div>
            )}

            {/* External Bookings Tab */}
            {activeTab === "external" && (
                <div>
                    <h2 className="text-2xl mb-4">External Bookings (Airbnb, VRBO, etc.)</h2>

                    {/* iCal Feeds Section */}
                    <div className="mb-6">
                        <h3 className="text-lg mb-2">iCal Calendar Sync</h3>
                        <div className="mb-4">
                            <button
                                onClick={() => setShowAddIcal(!showAddIcal)}
                                className="bg-purple-500 text-white px-4 py-2 rounded mr-2"
                            >
                                {showAddIcal ? "Cancel" : "Add iCal Feed"}
                            </button>
                            <button
                                onClick={async () => {
                                    setSyncing(true);
                                    await fetch("/api/admin/ical-feeds/sync", { method: "POST" });
                                    setSyncing(false);
                                    fetchData();
                                }}
                                disabled={syncing}
                                className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                            >
                                {syncing ? "Syncing..." : "Sync All Feeds"}
                            </button>
                        </div>

                        {/* Scheduler Status */}
                        {schedulerStatus && (
                            <div className="mb-4 p-3 bg-gray-100 rounded">
                                <div className="flex items-center">
                                    <div className={`w-3 h-3 rounded-full mr-2 ${schedulerStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-sm">
                                        Auto-sync: {schedulerStatus.isRunning ? 'Running (every 30 min)' : 'Stopped'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    iCal feeds are automatically synced every 30 minutes for near real-time updates
                                </p>
                            </div>
                        )}

                        {showAddIcal && (
                            <div className="bg-white p-4 rounded shadow mb-4">
                                <h4 className="text-md mb-4">Add New iCal Feed</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Feed Name (e.g., Airbnb Main)"
                                        value={newIcalFeed.name}
                                        onChange={(e) => setNewIcalFeed({ ...newIcalFeed, name: e.target.value })}
                                        className="p-2 border rounded"
                                    />
                                    <select
                                        value={newIcalFeed.source}
                                        onChange={(e) => setNewIcalFeed({ ...newIcalFeed, source: e.target.value })}
                                        className="p-2 border rounded"
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
                                    className="w-full p-2 border rounded mt-4"
                                />
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
                                    className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
                                >
                                    Add Feed
                                </button>
                            </div>
                        )}

                        <div className="bg-white rounded shadow mb-4">
                            <h4 className="text-md p-4 border-b">Active iCal Feeds</h4>
                            {icalFeeds.length === 0 ? (
                                <p className="p-4 text-gray-500">No iCal feeds configured</p>
                            ) : (
                                <div className="p-4">
                                    {icalFeeds.map((feed) => (
                                        <div key={feed.id} className="flex justify-between items-center border-b py-2">
                                            <div>
                                                <span className="font-medium">{feed.name}</span>
                                                <span className="text-sm text-gray-500 ml-2">({feed.source})</span>
                                                {feed.lastSync && (
                                                    <span className="text-xs text-gray-400 ml-2">
                                                        Last sync: {new Date(feed.lastSync).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    await fetch(`/api/admin/ical-feeds/${feed.id}`, { method: "DELETE" });
                                                    fetchData();
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Manual Booking Entry */}
                    <div className="mb-4">
                        <button
                            onClick={() => setShowAddExternal(!showAddExternal)}
                            className="bg-green-500 text-white px-4 py-2 rounded"
                        >
                            {showAddExternal ? "Cancel" : "Add Manual Booking"}
                        </button>
                    </div>

                    {showAddExternal && (
                        <div className="bg-white p-4 rounded shadow mb-4">
                            <h3 className="text-lg mb-4">Add Manual External Booking</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    value={newExternalBooking.source}
                                    onChange={(e) => setNewExternalBooking({ ...newExternalBooking, source: e.target.value })}
                                    className="p-2 border rounded"
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
                                    className="p-2 border rounded"
                                />
                                <input
                                    type="date"
                                    value={newExternalBooking.startDate}
                                    onChange={(e) => setNewExternalBooking({ ...newExternalBooking, startDate: e.target.value })}
                                    className="p-2 border rounded"
                                />
                                <input
                                    type="date"
                                    value={newExternalBooking.endDate}
                                    onChange={(e) => setNewExternalBooking({ ...newExternalBooking, endDate: e.target.value })}
                                    className="p-2 border rounded"
                                />
                            </div>
                            <textarea
                                placeholder="Notes (optional)"
                                value={newExternalBooking.notes}
                                onChange={(e) => setNewExternalBooking({ ...newExternalBooking, notes: e.target.value })}
                                className="w-full p-2 border rounded mt-4"
                            />
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
                                className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
                            >
                                Save Booking
                            </button>
                        </div>
                    )}

                    <table className="w-full bg-white rounded shadow">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="p-2">Source</th>
                                <th className="p-2">Guest</th>
                                <th className="p-2">Dates</th>
                                <th className="p-2">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {externalBookings.map((b) => (
                                <tr key={b.id} className="border-t">
                                    <td className="p-2">{b.source}</td>
                                    <td className="p-2">{b.guestName}</td>
                                    <td className="p-2">{new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</td>
                                    <td className="p-2">{b.notes || "N/A"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Customers Tab */}
            {activeTab === "customers" && (
                <div>
                    <h2 className="text-2xl mb-4">Subscribers</h2>
                    <ul className="bg-white rounded shadow p-4">
                        {subscribers.map((s) => (
                            <li key={s.id} className="border-b py-2">{s.email} {s.name && `(${s.name})`}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Emails Tab */}
            {activeTab === "emails" && (
                <div>
                    <h2 className="text-2xl mb-4">Email Templates & Send</h2>
                    {/* @ts-ignore */}
                    <div className="bg-white p-4 rounded shadow">
                        <EmailPanel />
                    </div>
                </div>
            )}



            {/* Analytics Tab */}
            {activeTab === "analytics" && analytics && (
                <div>
                    <h2 className="text-2xl mb-4">Analytics</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="text-lg">Total Bookings</h3>
                            <p className="text-2xl font-bold">{analytics.totalBookings}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="text-lg">Total Revenue</h3>
                            <p className="text-2xl font-bold">${analytics.totalRevenue}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="text-lg">Occupancy Rate</h3>
                            <p className="text-2xl font-bold">{analytics.occupancyRate}%</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}