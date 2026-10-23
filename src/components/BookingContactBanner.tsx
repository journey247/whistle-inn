"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";

/**
 * Tells guests to call before they press a booking button, while online
 * checkout is paused. Without it they only found out at the last step of the
 * booking form.
 *
 * Reads the same public settings as the booking modal, so it disappears the
 * moment checkout goes live and always shows the booking contact the owner
 * set in the admin panel. Renders nothing until the settings load, and
 * nothing if they fail to — a missing banner is better than a wrong one.
 */

type Status = { paused: boolean; name: string; phone: string };

// One request per page, however many buttons the page has.
let pending: Promise<Status | null> | null = null;

function loadStatus(): Promise<Status | null> {
    pending ??= fetch("/api/settings/public")
        .then(r => (r.ok ? r.json() : null))
        .then(s => (s ? { paused: s.onlineCheckoutEnabled !== true, name: s.contactName, phone: s.contactPhone } : null))
        .catch(() => null);
    return pending;
}

export function BookingContactBanner({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
    const [status, setStatus] = useState<Status | null>(null);

    useEffect(() => {
        let live = true;
        loadStatus().then(s => { if (live) setStatus(s); });
        return () => { live = false; };
    }, []);

    if (!status?.paused || !status.phone) return null;

    const styles = tone === "dark"
        ? "bg-black/55 border-white/25 text-white backdrop-blur-md"
        : "bg-amber-50 border-amber-200 text-slate-800";

    return (
        <p role="status" className={`inline-flex items-start sm:items-center gap-2 text-left text-sm sm:text-base rounded-2xl border px-4 py-3 ${styles} ${className}`}>
            <Phone className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${tone === "dark" ? "text-brand-gold" : "text-amber-600"}`} aria-hidden />
            <span>
                Online booking is paused. To reserve, call {status.name} at{" "}
                <a href={`tel:${status.phone.replace(/[^\d+]/g, "")}`} className="font-semibold underline underline-offset-2 whitespace-nowrap">
                    {status.phone}
                </a>
                {" "}— or send a request and {status.name} will get back to you.
            </span>
        </p>
    );
}
