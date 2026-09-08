"use client";
import React, { useState, useEffect, useCallback } from "react";
import { DollarSign, Tag, Globe, Plus, Trash2, Save, RefreshCw, Check, FileText, Link2, Loader2, Clock, Sparkles, MessageSquare } from "lucide-react";
import { WebsiteEditor } from "./WebsiteEditor";
import { AmenityRequestsPanel } from "./AmenityRequestsPanel";
import { SmsPanel } from "./SmsPanel";

type AddToast = (msg: string, type?: "success" | "error" | "info") => void;
type SettingsTab = "pricing" | "coupons" | "content" | "channels" | "amenities" | "sms";

type SpecialRate = {
    id: string;
    startDate: string;
    endDate: string;
    pricePerNight?: number;
    label?: string;
};

type Coupon = {
    id: string;
    code: string;
    discountType: "PERCENT" | "FIXED";
    value: number;
    usedCount: number;
    isActive: boolean;
    validUntil?: string;
    maxUses?: number;
};

function fmt(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Pricing sub-tab ──────────────────────────────────────────────────────────
function PricingTab({ addToast }: { addToast: AddToast }) {
    const [rates, setRates]     = useState<SpecialRate[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(false);
    const [base, setBase]       = useState({ weekday: "", weekend: "", cleaning: "", minNights: "" });
    const [newRate, setNewRate] = useState({ start: "", end: "", price: "", label: "" });
    const [adding, setAdding]   = useState(false);
    const [showForm, setShowForm] = useState(false);

    const token = () => localStorage.getItem("adminToken") ?? "";
    const h = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` }), []);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetch("/api/admin/pricing", { headers: h() }).then(r => r.json()),
            fetch("/api/admin/content", { headers: h() }).then(r => r.json()),
        ]).then(([rates, content]) => {
            if (Array.isArray(rates)) setRates(rates);
            if (Array.isArray(content)) {
                const get = (key: string) => content.find((c: any) => c.key === key)?.value ?? "";
                setBase({
                    weekday:   get("base_weekday_price"),
                    weekend:   get("base_weekend_price"),
                    cleaning:  get("cleaning_fee"),
                    minNights: get("minimum_nights"),
                });
            }
        }).catch(() => addToast("Failed to load pricing", "error"))
          .finally(() => setLoading(false));
    }, [h, addToast]);

    const saveBase = async () => {
        setSaving(true);
        try {
            const fields = [
                { key: "base_weekday_price", value: base.weekday,   label: "Weekday Rate",    type: "text", section: "pricing", category: "base" },
                { key: "base_weekend_price", value: base.weekend,   label: "Weekend Rate",    type: "text", section: "pricing", category: "base" },
                { key: "cleaning_fee",       value: base.cleaning,  label: "Cleaning Fee",    type: "text", section: "pricing", category: "base" },
                { key: "minimum_nights",     value: base.minNights, label: "Minimum Nights",  type: "text", section: "pricing", category: "base" },
            ];
            await Promise.all(fields.map(f =>
                fetch("/api/admin/content", { method: "PUT", headers: h(), body: JSON.stringify(f) })
            ));
            addToast("Base rates saved", "success");
        } catch {
            addToast("Failed to save rates", "error");
        } finally {
            setSaving(false);
        }
    };

    const addRate = async () => {
        if (!newRate.start || !newRate.end || !newRate.price) return;
        setAdding(true);
        try {
            const res = await fetch("/api/admin/pricing", {
                method: "POST", headers: h(),
                body: JSON.stringify({ startDate: newRate.start, endDate: newRate.end, price: Number(newRate.price), label: newRate.label, minStay: 1 }),
            });
            if (res.ok) {
                const r = await res.json();
                setRates(prev => [...prev, r]);
                setNewRate({ start: "", end: "", price: "", label: "" });
                setShowForm(false);
                addToast("Special rate added", "success");
            } else {
                addToast("Failed to add rate", "error");
            }
        } catch { addToast("Error adding rate", "error"); }
        setAdding(false);
    };

    const deleteRate = async (id: string) => {
        if (!window.confirm("Remove this special rate? This cannot be undone.")) return;
        await fetch(`/api/admin/pricing?id=${id}`, { method: "DELETE", headers: h() });
        setRates(prev => prev.filter(r => r.id !== id));
        addToast("Rate removed", "success");
    };

    if (loading) return <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

    return (
        <div className="space-y-5">
            {/* Base rates */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                <h3 className="font-semibold text-sm text-gray-900">Base Rates</h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: "Weekday / night", key: "weekday" as const },
                        { label: "Weekend / night", key: "weekend" as const },
                        { label: "Cleaning fee",    key: "cleaning" as const },
                        { label: "Min. nights",     key: "minNights" as const },
                    ].map(({ label, key }) => (
                        <div key={key}>
                            <label className="block text-xs text-gray-500 mb-1">{label}</label>
                            <div className="relative">
                                {key !== "minNights" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>}
                                <input
                                    type="number" value={base[key]} onChange={e => setBase(p => ({ ...p, [key]: e.target.value }))}
                                    className={`w-full ${key !== "minNights" ? "pl-7" : "pl-3"} pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold`}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={saveBase} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-brand-gold text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-500 transition disabled:opacity-50">
                    {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Save Base Rates</>}
                </button>
            </div>

            {/* Special rates */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900">Special Rates</h3>
                    <button onClick={() => setShowForm(v => !v)}
                        className="flex items-center gap-1 text-xs text-brand-gold font-semibold hover:text-yellow-600">
                        <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                </div>
                {showForm && (
                    <div className="space-y-2 border border-dashed border-gray-200 rounded-xl p-3">
                        <input value={newRate.label} onChange={e => setNewRate(p => ({ ...p, label: e.target.value }))}
                            placeholder="Label (e.g. Holidays)"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold" />
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">From</label>
                                <input type="date" value={newRate.start} onChange={e => setNewRate(p => ({ ...p, start: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">To</label>
                                <input type="date" value={newRate.end} onChange={e => setNewRate(p => ({ ...p, end: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold" />
                            </div>
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input type="number" value={newRate.price} onChange={e => setNewRate(p => ({ ...p, price: e.target.value }))}
                                placeholder="Price per night"
                                className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={addRate} disabled={adding}
                                className="flex-1 bg-brand-gold text-white py-2 rounded-xl text-xs font-semibold hover:bg-yellow-500 disabled:opacity-50 transition">
                                {adding ? "Adding…" : "Add Rate"}
                            </button>
                            <button onClick={() => setShowForm(false)}
                                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
                {rates.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">No special rates set</p>
                ) : (
                    <div className="space-y-2">
                        {rates.map(r => (
                            <div key={r.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800">{r.label || "Special Rate"}</p>
                                    <p className="text-xs text-gray-400">{fmt(r.startDate)} → {fmt(r.endDate)}</p>
                                </div>
                                <p className="text-sm font-bold text-gray-900 shrink-0">${r.pricePerNight}/night</p>
                                <button onClick={() => deleteRate(r.id)} className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Coupons sub-tab ──────────────────────────────────────────────────────────
function CouponsTab({ addToast }: { addToast: AddToast }) {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ code: "", type: "PERCENT" as "PERCENT" | "FIXED", value: "", maxUses: "", expiry: "" });
    const [adding, setAdding] = useState(false);

    const token = () => localStorage.getItem("adminToken") ?? "";
    const h = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` }), []);

    useEffect(() => {
        setLoading(true);
        fetch("/api/admin/coupons", { headers: h() })
            .then(r => r.json()).then(d => { if (Array.isArray(d)) setCoupons(d); })
            .catch(() => addToast("Failed to load coupons", "error"))
            .finally(() => setLoading(false));
    }, [h, addToast]);

    const addCoupon = async () => {
        if (!form.code || !form.value) return;
        setAdding(true);
        try {
            const res = await fetch("/api/admin/coupons", {
                method: "POST", headers: h(),
                body: JSON.stringify({
                    code: form.code.toUpperCase(), discountType: form.type,
                    discountValue: Number(form.value), active: true,
                    maxUses: form.maxUses ? Number(form.maxUses) : undefined,
                    expiresAt: form.expiry || undefined,
                }),
            });
            if (res.ok) {
                const newCoupon = await res.json();
                setCoupons(p => [...p, newCoupon]);
                setForm({ code: "", type: "PERCENT", value: "", maxUses: "", expiry: "" });
                setShowForm(false);
                addToast("Coupon created", "success");
            } else addToast("Failed to create coupon", "error");
        } catch { addToast("Error creating coupon", "error"); }
        setAdding(false);
    };

    const deleteCoupon = async (id: string) => {
        if (!window.confirm("Delete this coupon? This cannot be undone.")) return;
        await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE", headers: h() });
        setCoupons(p => p.filter(c => c.id !== id));
        addToast("Coupon deleted", "success");
    };

    if (loading) return <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{coupons.length} coupon{coupons.length !== 1 ? "s" : ""}</p>
                <button onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-1 text-xs text-brand-gold font-semibold hover:text-yellow-600">
                    <Plus className="w-3.5 h-3.5" /> New Coupon
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <h3 className="font-semibold text-sm text-gray-900">New Coupon</h3>
                    <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        placeholder="CODE (e.g. SUMMER20)"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold uppercase" />
                    <div className="grid grid-cols-2 gap-2">
                        <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white">
                            <option value="PERCENT">% Off</option>
                            <option value="FIXED">$ Off</option>
                        </select>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                {form.type === "PERCENT" ? "%" : "$"}
                            </span>
                            <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                                placeholder={form.type === "PERCENT" ? "10" : "50"}
                                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Max uses (optional)</label>
                            <input type="number" value={form.maxUses} onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))}
                                placeholder="Unlimited"
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Expires (optional)</label>
                            <input type="date" value={form.expiry} onChange={e => setForm(p => ({ ...p, expiry: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={addCoupon} disabled={adding}
                            className="flex-1 bg-brand-gold text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50 transition">
                            {adding ? "Creating…" : "Create Coupon"}
                        </button>
                        <button onClick={() => setShowForm(false)}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {coupons.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <Tag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No coupons yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {coupons.map(c => (
                        <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-sm font-bold text-gray-900">{c.code}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        {c.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {c.discountType === "PERCENT" ? `${c.value}% off` : `$${c.value} off`}
                                    {" · "}Used {c.usedCount} time{c.usedCount !== 1 ? "s" : ""}
                                    {c.maxUses ? ` of ${c.maxUses}` : ""}
                                    {c.validUntil ? ` · Expires ${fmt(c.validUntil)}` : ""}
                                </p>
                            </div>
                            <button onClick={() => deleteCoupon(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Content sub-tab ──────────────────────────────────────────────────────────
function ContentTab({ addToast }: { addToast: AddToast }) {
    const [blocks, setBlocks]   = useState<{ key: string; value: string; label: string; type: string; section: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState<string | null>(null);
    const [edits, setEdits]     = useState<Record<string, string>>({});

    const token = () => localStorage.getItem("adminToken") ?? "";
    const h = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` }), []);

    useEffect(() => {
        setLoading(true);
        fetch("/api/admin/content", { headers: h() })
            .then(r => r.json()).then(d => { if (Array.isArray(d)) setBlocks(d); })
            .catch(() => addToast("Failed to load content", "error"))
            .finally(() => setLoading(false));
    }, [h, addToast]);

    const save = async (block: typeof blocks[0]) => {
        const value = edits[block.key] ?? block.value;
        setSaving(block.key);
        try {
            await fetch("/api/admin/content", {
                method: "PUT", headers: h(),
                body: JSON.stringify({ key: block.key, value, label: block.label, type: block.type, section: block.section }),
            });
            setBlocks(prev => prev.map(b => b.key === block.key ? { ...b, value } : b));
            addToast("Saved", "success");
        } catch { addToast("Failed to save", "error"); }
        setSaving(null);
    };

    if (loading) return <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

    // Group by section
    const sections = [...new Set(blocks.map(b => b.section))].filter(Boolean);

    return (
        <div className="space-y-4">
            {sections.map(section => {
                const sectionBlocks = blocks.filter(b => b.section === section && b.type !== "image_url");
                if (sectionBlocks.length === 0) return null;
                return (
                    <div key={section} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                        <h3 className="font-semibold text-sm text-gray-900 capitalize">{section.replace(/_/g, " ")}</h3>
                        {sectionBlocks.map(block => {
                            const val = edits[block.key] ?? block.value;
                            const changed = val !== block.value;
                            return (
                                <div key={block.key} className="space-y-1.5">
                                    <label className="block text-xs font-medium text-gray-600">{block.label}</label>
                                    {block.type === "textarea" || block.type === "markdown" ? (
                                        <textarea
                                            value={val}
                                            onChange={e => setEdits(p => ({ ...p, [block.key]: e.target.value }))}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold resize-none"
                                        />
                                    ) : (
                                        <input
                                            value={val}
                                            onChange={e => setEdits(p => ({ ...p, [block.key]: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                                        />
                                    )}
                                    {changed && (
                                        <button onClick={() => save(block)} disabled={saving === block.key}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-brand-gold hover:text-yellow-600 transition">
                                            {saving === block.key
                                                ? <><RefreshCw className="w-3 h-3 animate-spin" /> Saving…</>
                                                : <><Check className="w-3 h-3" /> Save change</>}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
            {sections.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No content blocks found</p>
                </div>
            )}
        </div>
    );
}

// ── Channels (iCal Feeds) sub-tab ────────────────────────────────────────────
type ICalFeed = {
    id: string;
    name: string;
    url: string;
    source: string;
    lastSync?: string | null;
    createdAt: string;
};

const SOURCE_COLORS: Record<string, string> = {
    "Airbnb":       "bg-rose-100 text-rose-700",
    "VRBO":         "bg-blue-100 text-blue-700",
    "Booking.com":  "bg-indigo-100 text-indigo-700",
    "Hipcamp":      "bg-green-100 text-green-700",
};

function sourceBadge(source: string) {
    const cls = SOURCE_COLORS[source] ?? "bg-gray-100 text-gray-600";
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{source}</span>;
}

function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return "Never synced";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function ChannelsTab({ addToast }: { addToast: AddToast }) {
    const [feeds, setFeeds]     = useState<ICalFeed[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [adding, setAdding]   = useState(false);
    const [form, setForm]       = useState({ name: "", source: "Airbnb", url: "" });
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const token = () => localStorage.getItem("adminToken") ?? "";
    const h = useCallback(() => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
    }), []);

    const loadFeeds = useCallback(() => {
        setLoading(true);
        fetch("/api/admin/ical-feeds", { headers: h() })
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setFeeds(d); })
            .catch(() => addToast("Failed to load channels", "error"))
            .finally(() => setLoading(false));
    }, [h, addToast]);

    useEffect(() => { loadFeeds(); }, [loadFeeds]);

    const syncAll = async () => {
        setSyncing(true);
        try {
            const res = await fetch("/api/admin/ical-feeds/sync", { method: "POST", headers: h() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            const total = (data.results as { synced: number }[]).reduce((s, r) => s + r.synced, 0);
            const failed = (data.results as { error?: string }[]).filter(r => r.error).length;
            addToast(
                failed > 0
                    ? `Synced ${total} bookings (${failed} feed${failed > 1 ? "s" : ""} failed)`
                    : `✓ Synced ${total} booking${total !== 1 ? "s" : ""} across ${feeds.length} channel${feeds.length !== 1 ? "s" : ""}`,
                failed > 0 ? "error" : "success"
            );
            loadFeeds(); // refresh lastSync times
        } catch {
            addToast("Sync failed", "error");
        } finally {
            setSyncing(false);
        }
    };

    const addFeed = async () => {
        if (!form.name.trim() || !form.url.trim() || !form.source) return;
        // Basic URL validation
        try { new URL(form.url); } catch {
            addToast("Please enter a valid URL (starting with https://)", "error");
            return;
        }
        setAdding(true);
        try {
            const res = await fetch("/api/admin/ical-feeds", {
                method: "POST",
                headers: h(),
                body: JSON.stringify({ name: form.name.trim(), url: form.url.trim(), source: form.source }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setFeeds(prev => [data, ...prev]);
            setForm({ name: "", source: "Airbnb", url: "" });
            setShowForm(false);
            addToast(`✓ ${form.source} channel added — click Sync to import bookings`, "success");
        } catch (err: unknown) {
            addToast(err instanceof Error ? err.message : "Failed to add channel", "error");
        } finally {
            setAdding(false);
        }
    };

    const deleteFeed = async (feed: ICalFeed) => {
        if (!window.confirm(`Remove "${feed.name}"? This will also delete its synced bookings from the calendar.`)) return;
        setDeletingId(feed.id);
        try {
            await fetch(`/api/admin/ical-feeds?id=${feed.id}`, { method: "DELETE", headers: h() });
            setFeeds(prev => prev.filter(f => f.id !== feed.id));
            addToast("Channel removed", "success");
        } catch {
            addToast("Failed to remove channel", "error");
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return (
        <div className="flex justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500">{feeds.length} channel{feeds.length !== 1 ? "s" : ""} connected</p>
                </div>
                <div className="flex items-center gap-2">
                    {feeds.length > 0 && (
                        <button
                            onClick={syncAll}
                            disabled={syncing}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-300 disabled:opacity-50"
                        >
                            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            {syncing ? "Syncing…" : "Sync All"}
                        </button>
                    )}
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className="flex items-center gap-1 text-xs text-brand-gold font-semibold hover:text-yellow-600"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Channel
                    </button>
                </div>
            </div>

            {/* Add form */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <h3 className="font-semibold text-sm text-gray-900">Connect iCal Channel</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Name</label>
                            <input
                                value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Airbnb Listing"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Platform</label>
                            <select
                                value={form.source}
                                onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                            >
                                <option value="Airbnb">Airbnb</option>
                                <option value="VRBO">VRBO</option>
                                <option value="Booking.com">Booking.com</option>
                                <option value="Hipcamp">Hipcamp</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">iCal URL</label>
                        <input
                            value={form.url}
                            onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                            placeholder="https://www.airbnb.com/calendar/ical/..."
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                        />
                        <p className="text-xs text-gray-400 mt-1">Find this in your Airbnb calendar settings → Export Calendar</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={addFeed}
                            disabled={adding || !form.name.trim() || !form.url.trim()}
                            className="flex-1 bg-brand-gold text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50 transition"
                        >
                            {adding ? "Adding…" : "Add Channel"}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Feed list */}
            {feeds.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center space-y-3">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto">
                        <Link2 className="w-6 h-6 text-gray-300" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700">No channels connected</p>
                        <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                            Add your Airbnb or VRBO iCal URL to automatically sync bookings to the calendar.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-gold hover:text-yellow-600 transition"
                    >
                        <Plus className="w-4 h-4" /> Connect Airbnb or VRBO
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {feeds.map(feed => (
                        <div
                            key={feed.id}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {sourceBadge(feed.source)}
                                    <span className="font-medium text-sm text-gray-900 truncate">{feed.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    <span>{timeAgo(feed.lastSync)}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => deleteFeed(feed)}
                                disabled={deletingId === feed.id}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition shrink-0 disabled:opacity-50"
                                title="Remove channel"
                            >
                                {deletingId === feed.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />
                                }
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Help callout */}
            {feeds.length > 0 && (
                <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 text-xs text-sky-700 space-y-1">
                    <p className="font-semibold">Bookings sync automatically every day at 2 AM UTC.</p>
                    <p className="text-sky-600">Use <span className="font-medium">Sync All</span> to pull in the latest reservations right now. They'll appear as sky-blue blocks on the Calendar tab.</p>
                </div>
            )}
        </div>
    );
}

// ── Main SettingsView ────────────────────────────────────────────────────────
export function SettingsView({ addToast }: { addToast: AddToast }) {
    const [tab, setTab] = useState<SettingsTab>("pricing");

    const TABS: { id: SettingsTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
        { id: "pricing",  label: "Pricing",   Icon: DollarSign },
        { id: "coupons",  label: "Coupons",   Icon: Tag },
        { id: "channels", label: "Channels",  Icon: Link2 },
        { id: "content",  label: "Website",   Icon: Globe },
        { id: "amenities", label: "Amenities", Icon: Sparkles },
        { id: "sms",      label: "SMS",       Icon: MessageSquare },
    ];

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>

            {/* Sub-tabs */}
            <div className="flex flex-wrap gap-1.5">
                {TABS.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                            tab === id ? "bg-brand-gold text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}>
                        <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                ))}
            </div>

            {tab === "pricing"  && <PricingTab  addToast={addToast} />}
            {tab === "coupons"  && <CouponsTab  addToast={addToast} />}
            {tab === "channels" && <ChannelsTab addToast={addToast} />}
            {tab === "content"  && <WebsiteEditor addToast={addToast} />}
            {tab === "amenities" && <AmenityRequestsPanel />}
            {tab === "sms"      && <SmsPanel addToast={addToast} />}
        </div>
    );
}
