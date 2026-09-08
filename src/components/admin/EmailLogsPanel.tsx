"use client";

import React, { useEffect, useState } from "react";
import { Inbox, Loader2, RefreshCw, CheckCircle, Mail } from "lucide-react";
import { format } from "date-fns";

type EmailLog = {
    id: string;
    to: string;
    subject: string;
    template?: string | null;
    bookingId?: string | null;
    createdAt: string;
};

export function EmailLogsPanel() {
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/api/admin/email-logs", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setLogs(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    const filtered = logs.filter(l =>
        l.to.toLowerCase().includes(search.toLowerCase()) ||
        l.subject.toLowerCase().includes(search.toLowerCase()) ||
        (l.template || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Inbox className="w-5 h-5 text-brand-gold" />
                        Email Logs
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">Last 200 emails sent by the system</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm transition"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by recipient, subject, or template..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                    <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">{search ? "No emails match your search." : "No emails sent yet."}</p>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-3 px-4 font-semibold text-slate-600 text-sm">To</th>
                                    <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Subject</th>
                                    <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Template</th>
                                    <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Sent</th>
                                    <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 text-sm font-medium text-slate-900">{log.to}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">{log.subject}</td>
                                        <td className="py-3 px-4">
                                            {log.template ? (
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                                    {log.template}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                                            {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                                                <CheckCircle className="w-3 h-3" /> Sent
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                        {filtered.map(log => (
                            <div key={log.id} className="border border-slate-200 rounded-lg p-4 space-y-2 bg-slate-50">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-slate-900 text-sm truncate">{log.to}</p>
                                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                        <CheckCircle className="w-3 h-3" /> Sent
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 truncate">{log.subject}</p>
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    {log.template && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{log.template}</span>
                                    )}
                                    <span>{format(new Date(log.createdAt), "MMM d, h:mm a")}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-slate-400 mt-4 text-right">
                        Showing {filtered.length} of {logs.length} emails
                    </p>
                </>
            )}
        </div>
    );
}
