"use client";
import React, { useState, useEffect, useCallback } from "react";
import { getAdminToken } from "@/lib/adminToken";
import { CreditCard, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

type AddToast = (msg: string, type?: "success" | "error" | "info") => void;

type Status = {
    configured: boolean;
    accountId: string | null;
    chargesEnabled: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted: boolean;
    requirementsDue?: number;
};

/**
 * Connect the owner's own Stripe account so guest payments are paid into it.
 * Until it is connected and approved, payments keep going to the site's
 * existing Stripe account.
 */
export function StripeConnectCard({ addToast }: { addToast: AddToast }) {
    const [status, setStatus] = useState<Status | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    const h = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken() ?? ""}` }), []);

    const load = useCallback(() => {
        setLoading(true);
        fetch("/api/admin/stripe-connect", { headers: h() })
            .then(r => r.json())
            .then(data => setStatus(data.error ? null : data))
            .catch(() => setStatus(null))
            .finally(() => setLoading(false));
    }, [h]);

    useEffect(() => { load(); }, [load]);

    const startOnboarding = async () => {
        setStarting(true);
        try {
            const res = await fetch("/api/admin/stripe-connect", { method: "POST", headers: h(), body: "{}" });
            const data = await res.json();
            if (!res.ok || !data.url) throw new Error(data.error || "Could not start Stripe onboarding");
            window.location.href = data.url;
        } catch (err: any) {
            addToast(err.message, "error");
            setStarting(false);
        }
    };

    const connected = !!status?.chargesEnabled;
    const started = !!status?.accountId && !connected;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-sm text-gray-900">Payments</h3>
                </div>
                <button onClick={load} disabled={loading} aria-label="Refresh payment status"
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {loading && !status ? (
                <div className="flex justify-center py-3"><RefreshCw className="w-4 h-4 animate-spin text-gray-400" /></div>
            ) : !status ? (
                <p className="text-sm text-gray-500">Payment status is unavailable right now.</p>
            ) : !status.configured ? (
                <p className="text-sm text-gray-500">Stripe isn&apos;t set up on this site yet.</p>
            ) : connected ? (
                <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium">Guest payments go to your Stripe account.</p>
                        {status.payoutsEnabled === false && (
                            <p className="text-xs mt-1">Payouts are paused until Stripe has everything it needs — check your Stripe Dashboard.</p>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {started && (
                        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl p-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>
                                {status.detailsSubmitted
                                    ? "Stripe is reviewing your details. Payments switch to your account once approved."
                                    : `Setup isn't finished${status.requirementsDue ? ` — Stripe needs ${status.requirementsDue} more item${status.requirementsDue !== 1 ? "s" : ""}` : ""}.`}
                            </p>
                        </div>
                    )}
                    <p className="text-xs text-gray-500">
                        Connect your own Stripe account so guest payments, refunds and payouts are yours.
                        Until then, payments go to the site&apos;s current Stripe account.
                    </p>
                    <button onClick={startOnboarding} disabled={starting}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50">
                        {starting
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Opening Stripe…</>
                            : <><ExternalLink className="w-3.5 h-3.5" /> {started ? "Continue Stripe setup" : "Connect Stripe account"}</>}
                    </button>
                </>
            )}
        </div>
    );
}
