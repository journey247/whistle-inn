"use client";
import { useState } from "react";

export function NewsletterSignup() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            alert("Subscribed successfully!");
            setEmail("");
        } catch (error) {
            alert("Subscription failed.");
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="flex space-x-2 mt-4">
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 p-2 border rounded"
                required
            />
            <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
                {loading ? "Subscribing..." : "Subscribe"}
            </button>
        </form>
    );
}