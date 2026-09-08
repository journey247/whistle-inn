"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { authHeaders, jsonAuthHeaders } from '@/lib/adminToken';

type SmsLog = {
    id: string;
    to: string;
    body: string;
    type?: string;
    bookingId?: string;
    createdAt: string;
};

type AddToast = (message: string, type?: 'success' | 'error' | 'info') => void;

// Loose E.164 check: leading +, then 8–15 digits.
const E164 = /^\+[1-9]\d{7,14}$/;

export function SmsPanel({ addToast }: { addToast: AddToast }) {
    const [to, setTo] = useState('');
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState<SmsLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/sms-logs', { headers: authHeaders() });
            if (!res.ok) throw new Error('Failed to load SMS logs');
            const data = await res.json();
            // Defensive: an error payload here would otherwise crash the .map below
            setLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleSend = async () => {
        const trimmedTo = to.trim();
        if (!E164.test(trimmedTo)) {
            addToast('Enter the number in E.164 format, e.g. +15305551234', 'error');
            return;
        }

        setSending(true);
        try {
            const res = await fetch('/api/admin/notifications/sms', {
                method: 'POST',
                headers: jsonAuthHeaders(),
                body: JSON.stringify({ to: trimmedTo, message: message.trim() }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                addToast('SMS sent', 'success');
                setTo('');
                setMessage('');
                fetchLogs();
            } else {
                addToast(data.error || 'Failed to send SMS', 'error');
            }
        } catch (err) {
            console.error(err);
            addToast('Failed to send SMS', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Compose */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-brand-gold" /> Send a text
                </h3>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
                    <input
                        type="tel"
                        placeholder="+15305551234"
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Include the country code, e.g. +1 for the US.</p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                    <textarea
                        placeholder="Your message…"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        maxLength={480}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm h-24 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{message.length}/480 characters</p>
                </div>

                <button
                    onClick={handleSend}
                    disabled={!to.trim() || !message.trim() || sending}
                    className="w-full flex items-center justify-center gap-2 bg-brand-gold text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-500 transition disabled:opacity-50"
                >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? 'Sending…' : 'Send SMS'}
                </button>
            </div>

            {/* Log */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent messages</h4>
                {loading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-brand-gold" />
                    </div>
                ) : logs.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No SMS activity yet.</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {logs.map(l => (
                            <div key={l.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                                <div className="flex justify-between items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900">{l.to}</span>
                                    <span className="text-[11px] text-gray-400 shrink-0">
                                        {new Date(l.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 break-words">{l.body}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
