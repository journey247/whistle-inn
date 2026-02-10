"use client";
import { useState } from "react";
import { Mail, Check } from "lucide-react";

export function NewsletterSignup() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setSuccess(true);
                setEmail("");
                setTimeout(() => setSuccess(false), 3000);
            } else {
                throw new Error('Subscription failed');
            }
        } catch (error) {
            alert("Subscription failed. Please try again.");
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
                <Check className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base font-medium">Thanks for subscribing!</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 mt-4">
            <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email for updates"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm sm:text-base bg-white text-slate-900 touch-manipulation"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full sm:w-auto bg-brand-gold hover:bg-yellow-500 disabled:bg-gray-300 text-white font-semibold px-6 py-3 rounded-xl transition-all active:scale-95 touch-manipulation min-h-[48px] flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Subscribing...</span>
                    </>
                ) : (
                    "Subscribe"
                )}
            </button>
        </form>
    );
}