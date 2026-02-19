"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Home, KeyRound, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const userId = searchParams.get("id");

    const [mode, setMode] = useState<"request" | "reset">(token && userId ? "reset" : "request");
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const handleRequest = async () => {
        setError("");
        if (!email) { setError("Please enter your email address."); return; }
        setLoading(true);
        try {
            await fetch("/api/admin/auth/reset-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            // Always show success (don't leak if email exists)
            setDone(true);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        setError("");
        if (!newPassword) { setError("Please enter a new password."); return; }
        if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/admin/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, userId, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Reset failed. Your link may have expired.");
            } else {
                setDone(true);
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green to-brand-gold p-4">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="text-center mb-6">
                    <KeyRound className="w-12 h-12 mx-auto text-brand-gold mb-3" />
                    <h1 className="text-2xl font-bold text-slate-900">
                        {mode === "request" ? "Forgot Password" : "Set New Password"}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {mode === "request"
                            ? "Enter your admin email and we'll send you a reset link."
                            : "Enter and confirm your new password below."}
                    </p>
                </div>

                {done ? (
                    <div className="text-center space-y-4">
                        <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
                        <p className="text-slate-700 font-medium">
                            {mode === "request"
                                ? "If that email is registered, you'll receive a reset link shortly."
                                : "Your password has been updated successfully."}
                        </p>
                        <Link
                            href="/admin"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-gold hover:bg-yellow-500 text-white font-semibold rounded-lg transition mt-2"
                        >
                            <Home className="w-4 h-4" />
                            Back to Admin Login
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        {mode === "request" ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="your.email@example.com"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent transition bg-white text-slate-900"
                                        onKeyDown={e => e.key === "Enter" && handleRequest()}
                                    />
                                </div>
                                <button
                                    onClick={handleRequest}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-brand-gold hover:bg-yellow-500 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition min-h-[48px]"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                                </button>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent transition bg-white text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Repeat new password"
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-gold focus:border-transparent transition bg-white text-slate-900"
                                        onKeyDown={e => e.key === "Enter" && handleReset()}
                                    />
                                </div>
                                <button
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-brand-gold hover:bg-yellow-500 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition min-h-[48px]"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                                </button>
                            </>
                        )}

                        <Link
                            href="/admin"
                            className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition mt-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
