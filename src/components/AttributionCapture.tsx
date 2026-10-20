"use client";
import { useEffect } from "react";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_DAYS, classifyLanding, serializeAttribution } from "@/lib/attribution";

/**
 * Remember a tracked landing (ad click or campaign link) for 30 days so the
 * booking it leads to can be credited. Plain visits leave the cookie alone.
 */
export function AttributionCapture() {
    useEffect(() => {
        const attribution = classifyLanding(new URLSearchParams(window.location.search));
        if (!attribution) return;
        const maxAge = ATTRIBUTION_DAYS * 24 * 60 * 60;
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${ATTRIBUTION_COOKIE}=${serializeAttribution(attribution)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
    }, []);
    return null;
}
