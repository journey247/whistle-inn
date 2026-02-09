"use client";

import React, { useEffect, useState } from 'react';

type SmsLog = {
    id: string;
    to: string;
    body: string;
    type?: string;
    bookingId?: string;
    createdAt: string;
};

export function SmsPanel() {
    const [to, setTo] = useState('');
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState<SmsLog[]>([]);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        const token = localStorage.getItem('admin_token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const res = await fetch('/api/admin/sms-logs', { headers });
            const data = await res.json();
            setLogs(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSend = async () => {
        setSending(true);
        try {
            const token = localStorage.getItem('admin_token');
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/admin/notifications/sms', {
                method: 'POST',
                headers,
                body: JSON.stringify({ to, message }),
            });
            const data = await res.json();
            if (data.success) {
                alert('SMS queued/sent');
                setTo('');
                setMessage('');
                fetchLogs();
            } else {
                alert(data.error || 'Failed to send');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to send SMS');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold mb-3">SMS Notifications</h3>

            <div className="mb-4">
                <input
                    type="tel"
                    placeholder="Phone number (E.164)"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full p-2 border rounded mb-2"
                />
                <textarea
                    placeholder="Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-2 border rounded h-24"
                />
                <div className="flex justify-end mt-2">
                    <button onClick={handleSend} disabled={!to || !message || sending} className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50">
                        {sending ? 'Sending...' : 'Send SMS (test)'}
                    </button>
                </div>
            </div>

            <div>
                <h4 className="font-medium mb-2">Recent SMS Logs</h4>
                {logs.length === 0 ? (
                    <p className="text-sm text-gray-500">No SMS activity yet</p>
                ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                        {logs.map((l) => (
                            <div key={l.id} className="p-2 border rounded">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm font-medium">{l.to}</div>
                                    <div className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleString()}</div>
                                </div>
                                <div className="text-sm text-gray-700 mt-1">{l.body}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
