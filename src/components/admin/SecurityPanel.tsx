"use client";
import React, { useState, useEffect, useCallback } from "react";
import { ShieldCheck, ShieldAlert, KeyRound, RefreshCw, Copy } from "lucide-react";

type AddToast = (msg: string, type?: "success" | "error" | "info") => void;

type Status = { enabled: boolean; required: boolean; recoveryCodesLeft: number };
type Setup = { secret: string; qrSvg: string };
type AuditEntry = { id: string; actorEmail: string | null; action: string; target: string | null; ip: string | null; createdAt: string };

async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
}

/** Settings → Security: two-factor login and the admin audit log. */
export function SecurityPanel({ addToast }: { addToast: AddToast }) {
    return (
        <div className="space-y-4">
            <TwoFactorCard addToast={addToast} />
            <AuditLogCard />
        </div>
    );
}

export function TwoFactorCard({ addToast, onEnabled }: { addToast: AddToast; onEnabled?: () => void }) {
    const [status, setStatus] = useState<Status | null>(null);
    const [setup, setSetup] = useState<Setup | null>(null);
    const [codes, setCodes] = useState<string[] | null>(null);
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [disabling, setDisabling] = useState(false);
    const [busy, setBusy] = useState(false);
    const [pendingContinue, setPendingContinue] = useState(false);

    const load = useCallback(() => {
        fetch("/api/admin/auth/2fa")
            .then(r => r.json())
            .then(d => setStatus(d.error ? null : d))
            .catch(() => setStatus(null));
    }, []);
    useEffect(() => { load(); }, [load]);

    const run = async (fn: () => Promise<void>) => {
        setBusy(true);
        try { await fn(); } catch (e) { addToast(e instanceof Error ? e.message : "Failed", "error"); }
        finally { setBusy(false); }
    };

    const start = () => run(async () => { setSetup(await post({ action: "setup" })); setCode(""); });
    const enable = () => run(async () => {
        const d = await post({ action: "enable", code });
        setCodes(d.recoveryCodes); setSetup(null); setCode("");
        addToast("Two-factor login is on. Other sessions were signed out.", "success");
        load();
        // Leave the codes on screen; the caller moves on once they are saved.
        if (onEnabled) setPendingContinue(true);
    });
    const disable = () => run(async () => {
        await post({ action: "disable", password, code });
        setDisabling(false); setPassword(""); setCode("");
        addToast("Two-factor login is off", "info");
        load();
    });
    const regenerate = () => run(async () => {
        const d = await post({ action: "regenerate_codes", code });
        setCodes(d.recoveryCodes); setCode("");
        load();
    });

    const input = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-gold/50";
    const button = "shrink-0 whitespace-nowrap px-4 py-2 rounded-xl bg-brand-gold text-white text-sm font-semibold hover:bg-yellow-600 transition disabled:opacity-50";

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
                {status?.enabled ? <ShieldCheck className="w-4 h-4 text-green-600" /> : <ShieldAlert className="w-4 h-4 text-amber-600" />}
                <h3 className="font-semibold text-sm text-gray-900">Two-factor login</h3>
                {status && (
                    <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${status.enabled ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {status.enabled ? "On" : status.required ? "Required" : "Off"}
                    </span>
                )}
            </div>
            <p className="text-xs text-gray-500">
                Signing in asks for a 6-digit code from an authenticator app (Google Authenticator, 1Password, Authy) as well as your password.
            </p>

            {codes && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-800">Save these recovery codes now. Each works once if you lose your phone. They won&apos;t be shown again.</p>
                    <div className="grid grid-cols-2 gap-1 font-mono text-sm text-gray-900">
                        {codes.map(c => <span key={c}>{c}</span>)}
                    </div>
                    <div className="flex gap-2">
                        <button className="text-xs font-semibold text-amber-800 inline-flex items-center gap-1"
                            onClick={() => { navigator.clipboard?.writeText(codes.join("\n")); addToast("Copied", "success"); }}>
                            <Copy className="w-3 h-3" /> Copy
                        </button>
                        <button className="text-xs font-semibold text-gray-600 ml-auto"
                            onClick={() => { setCodes(null); if (pendingContinue) onEnabled?.(); }}>I saved them</button>
                    </div>
                </div>
            )}

            {status && !status.enabled && !setup && (
                <button className={button} disabled={busy} onClick={start}>Set up two-factor login</button>
            )}

            {setup && (
                <div className="space-y-3">
                    <p className="text-xs text-gray-600">1. Scan this with your authenticator app, or type the key in.</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="QR code for your authenticator app" width={180} height={180}
                        src={`data:image/svg+xml;utf8,${encodeURIComponent(setup.qrSvg)}`} />
                    <code className="block text-xs break-all bg-gray-50 rounded-lg p-2 text-gray-800">{setup.secret}</code>
                    <label className="block text-xs text-gray-600" htmlFor="totp-enable">2. Enter the 6-digit code it shows.</label>
                    <div className="flex gap-2">
                        <input id="totp-enable" className={input} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
                        <button className={button} disabled={busy || code.length !== 6} onClick={enable}>Turn on</button>
                    </div>
                </div>
            )}

            {status?.enabled && (
                <div className="space-y-2">
                    <p className="text-xs text-gray-600 inline-flex items-center gap-1">
                        <KeyRound className="w-3 h-3" /> {status.recoveryCodesLeft} recovery code{status.recoveryCodesLeft === 1 ? "" : "s"} left
                    </p>
                    <label className="sr-only" htmlFor="totp-manage">Authenticator code</label>
                    <input id="totp-manage" className={input} placeholder="Code from your app" autoComplete="one-time-code"
                        value={code} onChange={e => setCode(e.target.value.trim())} />
                    {disabling && (
                        <>
                            <label className="sr-only" htmlFor="totp-password">Password</label>
                            <input id="totp-password" type="password" className={input} placeholder="Your password" autoComplete="current-password"
                                value={password} onChange={e => setPassword(e.target.value)} />
                        </>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <button className={button} disabled={busy || !code} onClick={regenerate}>New recovery codes</button>
                        {!status.required && (
                            disabling
                                ? <button className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold disabled:opacity-50"
                                    disabled={busy || !code || !password} onClick={disable}>Confirm turn off</button>
                                : <button className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold"
                                    onClick={() => setDisabling(true)}>Turn off</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function AuditLogCard() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [done, setDone] = useState(false);

    const load = useCallback(async (before?: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/audit-log${before ? `?before=${encodeURIComponent(before)}` : ""}`);
            const data = await res.json();
            const page: AuditEntry[] = data.entries ?? [];
            setEntries(prev => before ? [...prev, ...page] : page);
            setDone(page.length < 100);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-gray-900">Activity log</h3>
                <button className="ml-auto text-gray-400 hover:text-gray-700" aria-label="Refresh activity log" onClick={() => load()}>
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>
            <p className="text-xs text-gray-500">Every sign-in and every change made in this dashboard.</p>
            <div className="divide-y divide-gray-100">
                {entries.map(e => (
                    <div key={e.id} className="py-2 text-xs flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="text-gray-400 w-36 shrink-0">{new Date(e.createdAt).toLocaleString()}</span>
                        <span className="font-mono text-gray-900 break-all">{e.action}</span>
                        <span className="text-gray-500">{e.actorEmail ?? "—"}</span>
                        {e.ip && <span className="text-gray-400 ml-auto">{e.ip}</span>}
                    </div>
                ))}
                {!loading && entries.length === 0 && <p className="py-2 text-xs text-gray-400">No activity yet.</p>}
            </div>
            {!done && entries.length > 0 && (
                <button className="text-xs font-semibold text-brand-gold" disabled={loading}
                    onClick={() => load(entries[entries.length - 1].createdAt)}>Load older</button>
            )}
        </div>
    );
}
