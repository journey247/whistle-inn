"use client";

import React, { useEffect, useState } from 'react';

type Template = { id: string; name: string; subject: string; body: string };
type EmailLog = { id: string; to: string; subject: string; body: string; template?: string; createdAt: string };

export function EmailPanel() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [variables, setVariables] = useState('{}');
    const [creating, setCreating] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateSubject, setNewTemplateSubject] = useState('');
    const [newTemplateBody, setNewTemplateBody] = useState('');

    useEffect(() => {
        fetchTemplates();
        fetchLogs();
    }, []);

    const fetchTemplates = async () => {
        const token = localStorage.getItem('admin_token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/admin/email-templates', { headers });
        setTemplates(await res.json());
    };

    const fetchLogs = async () => {
        const token = localStorage.getItem('admin_token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/admin/email-logs', { headers });
        setLogs(await res.json());
    };

    const handleTemplateSelect = (id: string) => {
        setSelectedTemplate(id);
        const t = templates.find(t => t.id === id);
        if (t) {
            setSubject(t.subject);
            setBody(t.body);
        }
    };

    const handleCreateTemplate = async () => {
        setCreating(true);
        try {
            const token = localStorage.getItem('admin_token');
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            await fetch('/api/admin/email-templates', {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: newTemplateName, subject: newTemplateSubject, body: newTemplateBody }),
            });
            setNewTemplateName('');
            setNewTemplateSubject('');
            setNewTemplateBody('');
            fetchTemplates();
        } catch (err) {
            console.error(err);
            alert('Failed to create template');
        } finally {
            setCreating(false);
        }
    };

    const handleSend = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            let vars = {};
            try { vars = JSON.parse(variables); } catch (e) { alert('Variables must be valid JSON'); return; }

            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers,
                body: JSON.stringify({ to, subject, body, templateName: selectedTemplate, variables: vars }),
            });
            const data = await res.json();
            if (data.success) {
                alert('Email sent');
                setTo('');
                setSubject('');
                setBody('');
                fetchLogs();
            } else {
                alert(data.error || 'Failed to send');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to send');
        }
    };

    return (
        <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold mb-3">Email Templates & Send</h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="lg:col-span-1">
                    <h4 className="font-medium mb-2">Templates</h4>
                    <div className="space-y-2">
                        {templates.map(t => (
                            <button key={t.id} onClick={() => handleTemplateSelect(t.id)} className={`w-full text-left p-2 border rounded ${selectedTemplate === t.id ? 'bg-blue-50' : ''}`}>
                                <div className="font-medium">{t.name}</div>
                                <div className="text-xs text-gray-500">{t.subject}</div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-4">
                        <h5 className="font-medium">Create Template</h5>
                        <input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Name" className="w-full p-2 border rounded mb-2" />
                        <input value={newTemplateSubject} onChange={(e) => setNewTemplateSubject(e.target.value)} placeholder="Subject" className="w-full p-2 border rounded mb-2" />
                        <textarea value={newTemplateBody} onChange={(e) => setNewTemplateBody(e.target.value)} placeholder="Body (HTML)" className="w-full p-2 border rounded h-28 mb-2" />
                        <button onClick={handleCreateTemplate} disabled={creating || !newTemplateName} className="w-full bg-green-500 text-white px-4 py-2 rounded">Create</button>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <h4 className="font-medium mb-2">Compose & Send</h4>
                    <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To (email)" className="w-full p-2 border rounded mb-2" />
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full p-2 border rounded mb-2" />
                    <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body (HTML)" className="w-full p-2 border rounded h-36 mb-2" />
                    <textarea value={variables} onChange={(e) => setVariables(e.target.value)} placeholder='Variables as JSON, e.g. {"guestName":"Jane"}' className="w-full p-2 border rounded h-24 mb-2" />
                    <div className="flex justify-end space-x-2">
                        <button onClick={handleSend} className="bg-blue-500 text-white px-4 py-2 rounded">Send Email</button>
                    </div>

                    <div className="mt-6">
                        <h5 className="font-medium mb-2">Recent Email Logs</h5>
                        {logs.length === 0 ? (
                            <p className="text-sm text-gray-500">No email activity yet</p>
                        ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto">
                                {logs.map(l => (
                                    <div key={l.id} className="p-2 border rounded">
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm font-medium">{l.to}</div>
                                            <div className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleString()}</div>
                                        </div>
                                        <div className="text-sm text-gray-700 mt-1">{l.subject}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
