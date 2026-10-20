"use client";
import React, { useState, useEffect, useCallback } from "react";
import { getAdminToken } from "@/lib/adminToken";
import { Mail, Save, RefreshCw } from "lucide-react";

type AddToast = (msg: string, type?: "success" | "error" | "info") => void;

// Keys match FOLLOWUP_KEYS in src/lib/followups.ts (server-only, so not imported here).
const KEYS = { enabled: "followup_enabled", couponPercent: "followup_coupon_percent", reviewUrl: "review_url" };

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold";

/** Settings for the day-after-checkout thank-you email with a return-stay code. */
export function GuestFollowupsCard({ addToast }: { addToast: AddToast }) {
    const [enabled, setEnabled] = useState(false);
    const [percent, setPercent] = useState("10");
    const [reviewUrl, setReviewUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const h = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken() ?? ""}` }), []);

    useEffect(() => {
        fetch("/api/admin/content", { headers: h() })
            .then(r => r.json())
            .then(content => {
                if (!Array.isArray(content)) return;
                const get = (k: string) => content.find((c: any) => c.key === k)?.value;
                setEnabled(get(KEYS.enabled) === "true");
                setPercent(get(KEYS.couponPercent) ?? "10");
                setReviewUrl(get(KEYS.reviewUrl) ?? "");
            })
            .catch(() => addToast("Failed to load follow-up settings", "error"))
            .finally(() => setLoading(false));
    }, [h, addToast]);

    const save = async () => {
        const pct = Number(percent);
        if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
            addToast("Discount must be between 0 and 50%", "error");
            return;
        }
        if (reviewUrl && !/^https:\/\//.test(reviewUrl.trim())) {
            addToast("Review link must start with https://", "error");
            return;
        }
        setSaving(true);
        try {
            const fields: [string, string, string][] = [
                [KEYS.enabled, String(enabled), "Send post-stay follow-up emails"],
                [KEYS.couponPercent, String(pct), "Return-stay discount (%)"],
                [KEYS.reviewUrl, reviewUrl.trim(), "Review link"],
            ];
            const results = await Promise.all(fields.map(([key, value, label]) =>
                fetch("/api/admin/content", {
                    method: "PUT", headers: h(),
                    body: JSON.stringify({ key, value, label, type: "text", section: "marketing", category: "email" }),
                })
            ));
            if (results.some(r => !r.ok)) throw new Error();
            addToast("Follow-up settings saved", "success");
        } catch {
            addToast("Failed to save follow-up settings", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-6"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-sm text-gray-900">Guest Follow-up Email</h3>
            </div>
            <p className="text-xs text-gray-500">
                The day after checkout, guests who booked on this site get a thank-you, a review request,
                and a one-time discount code to book direct next time. Includes an unsubscribe link.
            </p>

            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-4 h-4 accent-brand-gold" />
                <span className="text-sm font-medium text-gray-800">Send follow-up emails</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="fu-pct" className="block text-xs text-gray-500 mb-1">Return discount (%)</label>
                    <input id="fu-pct" type="number" min="0" max="50" value={percent} onChange={e => setPercent(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                    <label htmlFor="fu-review" className="block text-xs text-gray-500 mb-1">Review link (Google, optional)</label>
                    <input id="fu-review" type="url" placeholder="https://g.page/r/…/review" value={reviewUrl}
                        onChange={e => setReviewUrl(e.target.value)} className={inputCls} />
                </div>
            </div>

            <button onClick={save} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-brand-gold text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-500 transition disabled:opacity-50">
                {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Save Follow-up Settings</>}
            </button>
        </div>
    );
}
