"use client";

import { useState, useEffect, useCallback } from "react";
import { getAdminToken } from "@/lib/adminToken";
import { RefreshCw, Check, ChevronRight, Image as ImageIcon, Type, AlignLeft, Eye, EyeOff, Loader2, Globe } from "lucide-react";

type AddToast = (msg: string, type?: "success" | "error" | "info") => void;

type Block = {
    key: string;
    value: string;
    label: string;
    type: string;
    section: string;
};

// ── Ordered section config with emoji icons and descriptions ──────────────────
const SECTIONS: { key: string; icon: string; desc: string }[] = [
    { key: "Hero Section",   icon: "🏔️", desc: "Main banner — headline, tagline, button" },
    { key: "Intro",          icon: "✨", desc: "Welcome text and property intro" },
    { key: "Highlights",     icon: "⭐", desc: "Property stats and feature callouts" },
    { key: "Adventures",     icon: "🎒", desc: "Outdoor adventures section header" },
    { key: "Skiing",         icon: "⛷️", desc: "Winter / ski resort content" },
    { key: "Fishing",        icon: "🎣", desc: "Fly fishing section content" },
    { key: "Serenity",       icon: "🚂", desc: "Train / railroad section" },
    { key: "Rooms",          icon: "🛏️", desc: "Bedroom names and descriptions" },
    { key: "Concierge",      icon: "🛎️", desc: "Concierge services copy" },
    { key: "Footer",         icon: "📍", desc: "Bottom CTA and footer text" },
];

// Image keys that exist in the database
const IMAGE_KEYS = [
    "hero_image", "hero_slider_1", "hero_slider_2", "hero_slider_3",
    "adventure_img_0", "adventure_img_1", "adventure_img_2",
    "fishing_img", "resort_img",
    "room_img_0", "room_img_1", "room_img_2", "room_img_3", "room_img_4",
    "footer_img",
];

function fieldIcon(type: string) {
    if (type === "textarea" || type === "markdown") return <AlignLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    if (type === "image_url" || type === "image") return <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    return <Type className="w-3.5 h-3.5 text-gray-400 shrink-0" />;
}

// ── Image preview tile ────────────────────────────────────────────────────────
function ImageField({
    block, edit, onChange, onSave, saving,
}: {
    block: Block; edit: string; onChange: (v: string) => void; onSave: () => void; saving: boolean;
}) {
    const changed = edit !== block.value;
    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{block.label}</p>
            <div className="flex gap-3 items-start">
                {/* Live image preview */}
                <div className="shrink-0 w-24 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                    {edit ? (
                        <img src={edit} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.opacity = "0.2")} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                        </div>
                    )}
                </div>
                <div className="flex-1 space-y-1.5">
                    <input
                        value={edit}
                        onChange={e => onChange(e.target.value)}
                        placeholder="/image.jpg or https://..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold font-mono text-xs"
                    />
                    {changed && (
                        <button onClick={onSave} disabled={saving}
                            className="flex items-center gap-1.5 text-xs font-semibold text-brand-gold hover:text-yellow-600 transition">
                            {saving ? <><RefreshCw className="w-3 h-3 animate-spin" /> Saving…</> : <><Check className="w-3 h-3" /> Save</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Text / textarea field ────────────────────────────────────────────────────
function TextField({
    block, edit, onChange, onSave, saving,
}: {
    block: Block; edit: string; onChange: (v: string) => void; onSave: () => void; saving: boolean;
}) {
    const changed = edit !== block.value;
    const isLong = block.type === "textarea" || block.type === "markdown" || edit.length > 120;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
                {fieldIcon(block.type)}
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{block.label}</p>
            </div>
            {isLong ? (
                <textarea
                    value={edit}
                    onChange={e => onChange(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold resize-none leading-relaxed"
                />
            ) : (
                <input
                    value={edit}
                    onChange={e => onChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                />
            )}
            {changed && (
                <button onClick={onSave} disabled={saving}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-gold hover:text-yellow-600 transition">
                    {saving ? <><RefreshCw className="w-3 h-3 animate-spin" /> Saving…</> : <><Check className="w-3 h-3" /> Save change</>}
                </button>
            )}
        </div>
    );
}

// ── Section preview card ─────────────────────────────────────────────────────
function SectionPreview({ sectionKey, blocks, edits }: {
    sectionKey: string; blocks: Block[]; edits: Record<string, string>;
}) {
    const val = (key: string) => edits[key] ?? blocks.find(b => b.key === key)?.value ?? "";
    const imgBlock = blocks.find(b => b.type === "image_url" || b.type === "image" || IMAGE_KEYS.includes(b.key));
    const imgSrc = imgBlock ? (edits[imgBlock.key] ?? imgBlock.value) : null;

    // pick up to 3 text fields for preview
    const textFields = blocks
        .filter(b => b.type !== "image_url" && b.type !== "image" && !IMAGE_KEYS.includes(b.key))
        .slice(0, 3);

    return (
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
            {imgSrc && (
                <div className="relative h-32 bg-gray-100">
                    <img src={imgSrc} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
            )}
            <div className="p-4 space-y-1">
                {textFields.map(b => {
                    const v = val(b.key);
                    if (!v) return null;
                    const isTitle = b.label.toLowerCase().includes("title") || b.label.toLowerCase().includes("headline");
                    return (
                        <p key={b.key} className={isTitle ? "font-bold text-gray-900 text-sm" : "text-xs text-gray-500 leading-snug line-clamp-2"}>
                            {v}
                        </p>
                    );
                })}
                {textFields.length === 0 && !imgSrc && (
                    <p className="text-xs text-gray-300 italic">No preview available</p>
                )}
            </div>
        </div>
    );
}

// ── Main WebsiteEditor ────────────────────────────────────────────────────────
export function WebsiteEditor({ addToast }: { addToast: AddToast }) {
    const [blocks, setBlocks]     = useState<Block[]>([]);
    const [loading, setLoading]   = useState(true);
    const [seeding, setSeeding]   = useState(false);
    const [saving, setSaving]     = useState<string | null>(null);
    const [edits, setEdits]       = useState<Record<string, string>>({});
    const [activeSection, setActive] = useState<string>("Hero Section");
    const [showPreview, setShowPreview] = useState(true);

    const token = useCallback(() => getAdminToken() ?? "", []);
    const headers = useCallback(() => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
    }), [token]);

    const loadBlocks = useCallback(() => {
        setLoading(true);
        fetch("/api/admin/content", { headers: headers() })
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setBlocks(d); })
            .catch(() => addToast("Failed to load content", "error"))
            .finally(() => setLoading(false));
    }, [headers, addToast]);

    useEffect(() => { loadBlocks(); }, [loadBlocks]);

    const seedContent = async () => {
        setSeeding(true);
        try {
            const res = await fetch("/api/admin/content/seed", {
                method: "POST",
                headers: headers(),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            addToast(`✓ ${data.message}`, "success");
            loadBlocks();
        } catch {
            addToast("Failed to seed content", "error");
        }
        setSeeding(false);
    };

    const save = async (block: Block) => {
        const value = edits[block.key] ?? block.value;
        setSaving(block.key);
        try {
            const res = await fetch("/api/admin/content", {
                method: "PUT",
                headers: headers(),
                body: JSON.stringify({ key: block.key, value, label: block.label, type: block.type, section: block.section }),
            });
            if (!res.ok) throw new Error();
            setBlocks(prev => prev.map(b => b.key === block.key ? { ...b, value } : b));
            // clear edit so "changed" indicator goes away
            setEdits(prev => { const n = { ...prev }; delete n[block.key]; return n; });
            addToast("Saved ✓", "success");
        } catch {
            addToast("Failed to save", "error");
        }
        setSaving(null);
    };

    // Build ordered sections from SECTIONS config + any DB-only sections
    const dbSections = [...new Set(blocks.map(b => b.section || "Other"))];
    const orderedKeys = [
        ...SECTIONS.map(s => s.key).filter(k => dbSections.includes(k)),
        ...dbSections.filter(k => !SECTIONS.some(s => s.key === k)),
    ];

    const sectionBlocks = blocks.filter(b => (b.section || "Other") === activeSection);
    const textBlocks = sectionBlocks.filter(b => b.type !== "image_url" && b.type !== "image" && !IMAGE_KEYS.includes(b.key));
    const imageBlocks = sectionBlocks.filter(b => b.type === "image_url" || b.type === "image" || IMAGE_KEYS.includes(b.key));

    const sectionMeta = SECTIONS.find(s => s.key === activeSection);
    const pendingCount = sectionBlocks.filter(b => (edits[b.key] ?? b.value) !== b.value).length;

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
        </div>
    );

    // Global empty state — no blocks at all in DB
    if (blocks.length === 0) return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto">
                <Globe className="w-7 h-7 text-brand-gold" />
            </div>
            <div>
                <h3 className="font-bold text-gray-900 text-base">No content blocks yet</h3>
                <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                    Click below to load your site's default text and images into the editor.
                </p>
            </div>
            <button
                onClick={seedContent}
                disabled={seeding}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gold text-white font-semibold hover:bg-yellow-600 transition disabled:opacity-50"
            >
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {seeding ? "Loading defaults…" : "Load default content"}
            </button>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-gray-900">Website Content</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Edit your site text and images section by section</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={seedContent}
                        disabled={seeding}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-50"
                        title="Load default content blocks into the database"
                    >
                        {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        {seeding ? "Loading…" : "Load defaults"}
                    </button>
                    <button
                        onClick={() => setShowPreview(p => !p)}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300"
                    >
                        {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showPreview ? "Hide preview" : "Show preview"}
                    </button>
                </div>
            </div>

            <div className="flex gap-4 min-h-0">
                {/* ── Left: section nav ────────────────────────────── */}
                <div className="w-44 shrink-0 space-y-0.5">
                    {orderedKeys.map(key => {
                        const meta = SECTIONS.find(s => s.key === key);
                        const sBlocks = blocks.filter(b => (b.section || "Other") === key);
                        const pending = sBlocks.filter(b => (edits[b.key] ?? b.value) !== b.value).length;
                        const active = key === activeSection;
                        return (
                            <button
                                key={key}
                                onClick={() => setActive(key)}
                                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 transition group ${
                                    active ? "bg-brand-gold text-white shadow-sm" : "hover:bg-gray-100 text-gray-700"
                                }`}
                            >
                                <span className="text-base leading-none">{meta?.icon ?? "📄"}</span>
                                <span className="flex-1 text-xs font-semibold truncate">{key.replace(" Section", "")}</span>
                                {pending > 0 && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/30 text-white" : "bg-brand-gold text-white"}`}>
                                        {pending}
                                    </span>
                                )}
                                <ChevronRight className={`w-3 h-3 shrink-0 ${active ? "text-white/60" : "text-gray-300 group-hover:text-gray-500"}`} />
                            </button>
                        );
                    })}
                </div>

                {/* ── Right: editor + preview ──────────────────────── */}
                <div className={`flex-1 min-w-0 ${showPreview ? "grid grid-cols-2 gap-4 items-start" : ""}`}>
                    {/* Editor panel */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Section header */}
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                            <span className="text-xl">{sectionMeta?.icon ?? "📄"}</span>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-gray-900">{activeSection}</h3>
                                {sectionMeta && <p className="text-xs text-gray-400 truncate">{sectionMeta.desc}</p>}
                            </div>
                            {pendingCount > 0 && (
                                <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                                    {pendingCount} unsaved
                                </span>
                            )}
                        </div>

                        <div className="p-4 space-y-5">
                            {/* Text fields */}
                            {textBlocks.length > 0 && (
                                <div className="space-y-4">
                                    {textBlocks.map(block => (
                                        <TextField
                                            key={block.key}
                                            block={block}
                                            edit={edits[block.key] ?? block.value}
                                            onChange={v => setEdits(p => ({ ...p, [block.key]: v }))}
                                            onSave={() => save(block)}
                                            saving={saving === block.key}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Image fields */}
                            {imageBlocks.length > 0 && (
                                <div className="space-y-4 pt-2 border-t border-gray-50">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Images</p>
                                    {imageBlocks.map(block => (
                                        <ImageField
                                            key={block.key}
                                            block={block}
                                            edit={edits[block.key] ?? block.value}
                                            onChange={v => setEdits(p => ({ ...p, [block.key]: v }))}
                                            onSave={() => save(block)}
                                            saving={saving === block.key}
                                        />
                                    ))}
                                </div>
                            )}

                            {sectionBlocks.length === 0 && (
                                <div className="py-10 text-center space-y-3">
                                    <p className="text-sm text-gray-400">No content fields yet.</p>
                                    <button
                                        onClick={seedContent}
                                        disabled={seeding}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gold text-white text-sm font-semibold hover:bg-yellow-600 transition disabled:opacity-50"
                                    >
                                        {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        {seeding ? "Loading defaults…" : "Load default content"}
                                    </button>
                                    <p className="text-xs text-gray-300">Populates all sections with your site's default text</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview panel */}
                    {showPreview && (
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                                <Eye className="w-3 h-3" /> Live Preview
                            </p>
                            <SectionPreview
                                sectionKey={activeSection}
                                blocks={sectionBlocks}
                                edits={edits}
                            />
                            {/* Full site link */}
                            <a
                                href="/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 text-xs text-brand-gold hover:text-yellow-600 font-medium py-2 border border-brand-gold/30 rounded-xl hover:bg-brand-gold/5 transition"
                            >
                                <Eye className="w-3 h-3" /> Open live site
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
