"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Home, Image as ImageIcon, Loader2,
    Plus, RefreshCw, Search, ShieldCheck, Trash2, Upload, BedDouble, Clock, X,
} from "lucide-react";
import {
    profileSchema, slugify,
    type PropertyProfile, type ProfileRoom, type RoomRate,
} from "@/lib/property-schema";
import { policySentence } from "@/lib/cancellationPolicy";

type AddToast = (msg: string, type?: "success" | "error" | "info") => void;

/**
 * Property setup: the owner enters everything that used to be a code file —
 * name, contact details, stay rules, rooms, photos and permits.
 *
 * Every step saves the whole profile (PUT /api/admin/property), so leaving
 * half-way loses nothing. The first save makes the profile the site's source
 * of truth; "Finish setup" on the last step marks onboarding complete.
 */

type StepId = "basics" | "stay" | "rooms" | "photos" | "permits" | "review";

const STEPS: { id: StepId; label: string; Icon: React.ComponentType<{ className?: string }>; fields: string[] }[] = [
    { id: "basics",  label: "Basics",           Icon: Home,        fields: ["name", "propertyType", "hostName", "email", "phone", "address", "locationLabel", "brandLine"] },
    { id: "stay",    label: "Stay rules",       Icon: Clock,       fields: ["checkinTime", "checkoutTime", "bedrooms", "maxGuests", "amenities", "cancellation"] },
    { id: "rooms",   label: "Rooms",            Icon: BedDouble,   fields: ["rooms"] },
    { id: "photos",  label: "Photos",           Icon: ImageIcon,   fields: ["heroImages", "galleryImages"] },
    { id: "permits", label: "Permits & search", Icon: Search,      fields: ["permits", "title", "description", "roomsDescription", "ogImageAlt"] },
    { id: "review",  label: "Review",           Icon: ShieldCheck, fields: [] },
];

type Errors = Record<string, string>;

const input = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold bg-white disabled:bg-gray-50 disabled:text-gray-500";
const card = "bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3";
const iconButton = "p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent transition";

function validate(profile: PropertyProfile): Errors {
    const result = profileSchema.safeParse(profile);
    if (result.success) return {};
    const errors: Errors = {};
    for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) errors[key] = issue.message;
    }
    return errors;
}

function stepErrors(errors: Errors, step: (typeof STEPS)[number]): string[] {
    return Object.keys(errors).filter(k => step.fields.some(f => k === f || k.startsWith(`${f}.`)));
}

// ── Form pieces ───────────────────────────────────────────────────────────────

function Field({ label, hint, error, children }: {
    label: string; hint?: string; error?: string;
    children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
    const id = useId();
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-xs font-semibold text-gray-600">{label}</label>
            {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
            {error
                ? <p id={`${id}-error`} className="text-xs text-red-600">{error}</p>
                : hint && <p id={`${id}-hint`} className="text-xs text-gray-400">{hint}</p>}
        </div>
    );
}

function TextInput({ label, value, onChange, error, hint, type = "text", placeholder, disabled }: {
    label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string;
    type?: string; placeholder?: string; disabled?: boolean;
}) {
    return (
        <Field label={label} hint={hint} error={error}>
            {props => (
                <input {...props} type={type} value={value} placeholder={placeholder} disabled={disabled}
                    onChange={e => onChange(e.target.value)} className={input} />
            )}
        </Field>
    );
}

function TextArea({ label, value, onChange, error, hint, rows = 3 }: {
    label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; rows?: number;
}) {
    return (
        <Field label={label} hint={hint} error={error}>
            {props => (
                <textarea {...props} rows={rows} value={value} onChange={e => onChange(e.target.value)}
                    className={`${input} resize-y leading-relaxed`} />
            )}
        </Field>
    );
}

function NumberInput({ label, value, onChange, error, hint, min = 0, prefix }: {
    label: string; value: number | ""; onChange: (v: number | "") => void; error?: string; hint?: string; min?: number; prefix?: string;
}) {
    return (
        <Field label={label} hint={hint} error={error}>
            {props => (
                <div className="relative">
                    {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
                    <input {...props} type="number" inputMode="decimal" min={min} value={value}
                        onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        className={`${input} ${prefix ? "pl-7" : ""}`} />
                </div>
            )}
        </Field>
    );
}

/** A photo: preview, a path or uploaded URL, and an upload button. */
function PhotoField({ label, value, onChange, error, addToast }: {
    label: string; value: string; onChange: (v: string) => void; error?: string; addToast: AddToast;
}) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const upload = async (file: File) => {
        setUploading(true);
        try {
            const body = new FormData();
            body.append("file", file);
            const res = await fetch("/api/admin/upload", { method: "POST", body });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Upload failed");
            onChange(data.url);
        } catch (err: any) {
            addToast(err?.message || "Upload failed", "error");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    return (
        <Field label={label} error={error} hint="Upload a photo, or enter the /path of one already on the site.">
            {props => (
                <div className="flex gap-3 items-start">
                    <div className="shrink-0 w-24 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                        {value
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={value} alt="" className="w-full h-full object-cover" />
                            : <ImageIcon className="w-5 h-5 text-gray-300" aria-hidden />}
                    </div>
                    <div className="flex-1 min-w-0 flex gap-2">
                        <input {...props} value={value} onChange={e => onChange(e.target.value)}
                            placeholder="/photo.jpg" className={`${input} font-mono text-xs`} />
                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="sr-only"
                            tabIndex={-1} aria-hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
                        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                            className="shrink-0 flex items-center gap-1.5 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            Upload
                        </button>
                    </div>
                </div>
            )}
        </Field>
    );
}

/** Move, remove controls for an item in an ordered list. */
function ListControls({ index, length, onMove, onRemove, label }: {
    index: number; length: number; onMove: (to: number) => void; onRemove: () => void; label: string;
}) {
    return (
        <div className="flex items-center gap-0.5 shrink-0">
            <button type="button" className={iconButton} onClick={() => onMove(index - 1)} disabled={index === 0} aria-label={`Move ${label} up`}>
                <ArrowUp className="w-4 h-4" />
            </button>
            <button type="button" className={iconButton} onClick={() => onMove(index + 1)} disabled={index === length - 1} aria-label={`Move ${label} down`}>
                <ArrowDown className="w-4 h-4" />
            </button>
            <button type="button" className={`${iconButton} hover:text-red-600`} onClick={onRemove} aria-label={`Remove ${label}`}>
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

function move<T>(list: T[], from: number, to: number): T[] {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

// ── Steps ─────────────────────────────────────────────────────────────────────

type StepProps = {
    profile: PropertyProfile;
    update: (fn: (p: PropertyProfile) => PropertyProfile) => void;
    errors: Errors;
    addToast: AddToast;
};

function BasicsStep({ profile, update, errors }: StepProps) {
    const set = <K extends keyof PropertyProfile>(key: K) => (value: PropertyProfile[K]) => update(p => ({ ...p, [key]: value }));
    const setAddress = (key: keyof PropertyProfile["address"]) => (value: string) =>
        update(p => ({ ...p, address: { ...p.address, [key]: value } }));

    return (
        <div className="space-y-4">
            <div className={card}>
                <h3 className="font-semibold text-sm text-gray-900">The property</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                    <TextInput label="Property name" value={profile.name} onChange={set("name")} error={errors.name} />
                    <TextInput label="Type of property" value={profile.propertyType} onChange={set("propertyType")} error={errors.propertyType}
                        hint="e.g. Victorian Farmhouse — used in photo descriptions" />
                </div>
                <TextInput label="Name for the footer" value={profile.brandLine} onChange={set("brandLine")} error={errors.brandLine}
                    hint="Shown after © in the footer, e.g. “Whistle Inn Private Getaway”" />
            </div>

            <div className={card}>
                <h3 className="font-semibold text-sm text-gray-900">How guests reach you</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                    <TextInput label="Host name" value={profile.hostName} onChange={set("hostName")} error={errors.hostName} />
                    <TextInput label="Email" type="email" value={profile.email} onChange={set("email")} error={errors.email} />
                    <TextInput label="Phone" type="tel" value={profile.phone} onChange={set("phone")} error={errors.phone} placeholder="(530) 555-0100" />
                </div>
            </div>

            <div className={card}>
                <h3 className="font-semibold text-sm text-gray-900">Address</h3>
                <TextInput label="Street" value={profile.address.street} onChange={setAddress("street")} error={errors["address.street"]} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <TextInput label="City" value={profile.address.locality} onChange={setAddress("locality")} error={errors["address.locality"]} />
                    <TextInput label="State" value={profile.address.region} onChange={setAddress("region")} error={errors["address.region"]} />
                    <TextInput label="ZIP" value={profile.address.postalCode} onChange={setAddress("postalCode")} error={errors["address.postalCode"]} />
                    <TextInput label="Country" value={profile.address.country} onChange={setAddress("country")} error={errors["address.country"]} hint="e.g. US" />
                </div>
                <TextInput label="Location for headlines" value={profile.locationLabel} onChange={set("locationLabel")} error={errors.locationLabel}
                    hint="Short and friendly, e.g. “Alta, California”" />
            </div>
        </div>
    );
}

function StayStep({ profile, update, errors }: StepProps) {
    const [amenity, setAmenity] = useState("");
    const c = profile.cancellation;
    const setPolicy = (key: keyof typeof c) => (value: number | "") =>
        update(p => ({ ...p, cancellation: { ...p.cancellation, [key]: value === "" ? 0 : value } }));
    const setNumber = (key: "bedrooms" | "maxGuests") => (value: number | "") =>
        update(p => ({ ...p, [key]: value === "" ? 0 : value }));

    const addAmenity = () => {
        const name = amenity.trim();
        if (!name || profile.amenities.some(a => a.toLowerCase() === name.toLowerCase())) return;
        update(p => ({ ...p, amenities: [...p.amenities, name] }));
        setAmenity("");
    };

    const policyValid = !Object.keys(errors).some(k => k.startsWith("cancellation"));

    return (
        <div className="space-y-4">
            <div className={card}>
                <h3 className="font-semibold text-sm text-gray-900">Check-in and capacity</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <TextInput label="Check-in" type="time" value={profile.checkinTime} onChange={v => update(p => ({ ...p, checkinTime: v }))} error={errors.checkinTime} />
                    <TextInput label="Checkout" type="time" value={profile.checkoutTime} onChange={v => update(p => ({ ...p, checkoutTime: v }))} error={errors.checkoutTime} />
                    <NumberInput label="Bedrooms" value={profile.bedrooms} onChange={setNumber("bedrooms")} error={errors.bedrooms} />
                    <NumberInput label="Most guests" value={profile.maxGuests} onChange={setNumber("maxGuests")} error={errors.maxGuests} min={1}
                        hint="Whole-house bookings above this are refused" />
                </div>
            </div>

            <div className={card}>
                <h3 className="font-semibold text-sm text-gray-900">Amenities</h3>
                <p className="text-xs text-gray-500">Listed for search engines. Keep each one short.</p>
                <ul className="flex flex-wrap gap-2" aria-label="Amenities">
                    {profile.amenities.map(a => (
                        <li key={a} className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                            {a}
                            <button type="button" onClick={() => update(p => ({ ...p, amenities: p.amenities.filter(x => x !== a) }))}
                                className="p-1 rounded-full hover:bg-gray-200" aria-label={`Remove ${a}`}>
                                <X className="w-3 h-3" />
                            </button>
                        </li>
                    ))}
                </ul>
                <form className="flex gap-2" onSubmit={e => { e.preventDefault(); addAmenity(); }}>
                    <input value={amenity} onChange={e => setAmenity(e.target.value)} placeholder="e.g. Hot tub" aria-label="New amenity" className={input} />
                    <button type="submit" className="shrink-0 flex items-center gap-1 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                </form>
            </div>

            <div className={card}>
                <h3 className="font-semibold text-sm text-gray-900">Cancellation policy</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <NumberInput label="Full refund if cancelled this many days out" value={c.fullRefundDays} onChange={setPolicy("fullRefundDays")} error={errors["cancellation.fullRefundDays"]} />
                    <NumberInput label="Partial refund from this many days out" value={c.partialRefundDays} onChange={setPolicy("partialRefundDays")} error={errors["cancellation.partialRefundDays"]} />
                    <NumberInput label="Partial refund (%)" value={c.partialRefundPercent} onChange={setPolicy("partialRefundPercent")} error={errors["cancellation.partialRefundPercent"]} />
                    <NumberInput label="Grace period after booking (hours)" value={c.graceHours} onChange={setPolicy("graceHours")} error={errors["cancellation.graceHours"]} />
                    <NumberInput label="…if check-in is at least (days)" value={c.graceMinDaysBeforeCheckIn} onChange={setPolicy("graceMinDaysBeforeCheckIn")} error={errors["cancellation.graceMinDaysBeforeCheckIn"]} />
                </div>
                {policyValid && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                        Guests will read: “{policySentence(c)}” Applies to new bookings and cancellations from now on.
                    </p>
                )}
            </div>
        </div>
    );
}

function RoomsStep({ profile, update, errors, addToast, roomRates, setRoomRates, savedSlugs }: StepProps & {
    roomRates: Record<string, Partial<RoomRate>>;
    setRoomRates: React.Dispatch<React.SetStateAction<Record<string, Partial<RoomRate>>>>;
    savedSlugs: Set<string>;
}) {
    const setRoom = (index: number, patch: Partial<ProfileRoom>) =>
        update(p => ({ ...p, rooms: p.rooms.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
    const setRate = (slug: string, patch: Partial<RoomRate>) =>
        setRoomRates(prev => ({ ...prev, [slug]: { ...prev[slug], ...patch } }));

    /** Prices are keyed by slug, so they move with it. */
    const setSlug = (index: number, from: string, to: string, patch: Partial<ProfileRoom> = {}) => {
        if (from !== to) {
            setRoomRates(prev => {
                const { [from]: rate, ...rest } = prev;
                return { ...rest, [to]: rate ?? {} };
            });
        }
        setRoom(index, { ...patch, slug: to });
    };

    const addRoom = () => {
        const taken = new Set(profile.rooms.map(r => r.slug));
        let slug = "new-room", n = 2;
        while (taken.has(slug)) slug = `new-room-${n++}`;
        update(p => ({
            ...p,
            rooms: [...p.rooms, { slug, bookable: true, title: "", beds: "", image: "", summary: "", description: "" }],
        }));
        setRate(slug, { isActive: true });
    };

    return (
        <div className="space-y-4">
            <div className={card}>
                <h3 className="font-semibold text-sm text-gray-900">Rooms</h3>
                <p className="text-xs text-gray-500">
                    Each room gets its own page at /rooms/&lt;link&gt;. Rooms sold on their own can be booked
                    separately from the whole house. Removing a room takes it off the site and off sale;
                    past bookings keep it.
                </p>
                {errors.rooms && <p className="text-xs text-red-600">{errors.rooms}</p>}
            </div>

            {profile.rooms.map((room, i) => {
                const e = (field: string) => errors[`rooms.${i}.${field}`];
                const isNew = !savedSlugs.has(room.slug);
                const rate = roomRates[room.slug] ?? {};
                const label = room.title || "new room";
                return (
                    <div key={i} className={card}>
                        <div className="flex items-start justify-between gap-3">
                            <h4 className="font-semibold text-sm text-gray-900 truncate pt-2">{room.title || "New room"}</h4>
                            <ListControls index={i} length={profile.rooms.length} label={label}
                                onMove={to => update(p => ({ ...p, rooms: move(p.rooms, i, to) }))}
                                onRemove={() => {
                                    if (window.confirm(`Remove ${label} from the site?`)) {
                                        update(p => ({ ...p, rooms: p.rooms.filter((_, j) => j !== i) }));
                                    }
                                }} />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                            <TextInput label="Room name" value={room.title} error={e("title")}
                                onChange={v => {
                                    // A new room's link follows its name until the owner edits the link.
                                    const following = isNew && (room.slug.startsWith("new-room") || room.slug === slugify(room.title));
                                    if (following && slugify(v)) setSlug(i, room.slug, slugify(v), { title: v });
                                    else setRoom(i, { title: v });
                                }} />
                            <TextInput label="Page link" value={room.slug} error={e("slug")} disabled={!isNew}
                                hint={isNew ? "Can’t be changed once saved" : `/rooms/${room.slug} — fixed so links keep working`}
                                onChange={v => setSlug(i, room.slug, v.toLowerCase().replace(/\s+/g, "-"))} />
                        </div>
                        <TextInput label="Beds" value={room.beds} onChange={v => setRoom(i, { beds: v })} error={e("beds")} placeholder="1 Queen Bed" />
                        <PhotoField label="Photo" value={room.image} onChange={v => setRoom(i, { image: v })} error={e("image")} addToast={addToast} />
                        <TextArea label="Summary" value={room.summary} onChange={v => setRoom(i, { summary: v })} error={e("summary")} rows={2}
                            hint="One or two sentences for the room card and search results" />
                        <TextArea label="Full description (optional)" value={room.description} onChange={v => setRoom(i, { description: v })}
                            error={e("description")} rows={4} hint="Shown on the room’s page. Leave a blank line between paragraphs." />

                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={room.bookable}
                                onChange={ev => setRoom(i, { bookable: ev.target.checked })}
                                className="rounded border-gray-300 text-brand-gold focus:ring-brand-gold" />
                            Guests can book this room on its own
                        </label>

                        {room.bookable && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                                <NumberInput label="Weekday / night" prefix="$" value={rate.weekdayPrice ?? ""} onChange={v => setRate(room.slug, { weekdayPrice: v === "" ? undefined : v })} />
                                <NumberInput label="Weekend / night" prefix="$" value={rate.weekendPrice ?? ""} onChange={v => setRate(room.slug, { weekendPrice: v === "" ? undefined : v })} />
                                <NumberInput label="Sleeps" min={1} value={rate.maxGuests ?? ""} onChange={v => setRate(room.slug, { maxGuests: v === "" ? undefined : v })} />
                                <label className="flex items-center gap-2 text-xs text-gray-600 pb-3">
                                    <input type="checkbox" checked={rate.isActive ?? true} onChange={ev => setRate(room.slug, { isActive: ev.target.checked })}
                                        className="rounded border-gray-300 text-brand-gold focus:ring-brand-gold" />
                                    On sale now
                                </label>
                            </div>
                        )}
                    </div>
                );
            })}

            <button type="button" onClick={addRoom}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-600 hover:border-brand-gold hover:text-brand-gold transition">
                <Plus className="w-4 h-4" /> Add a room
            </button>
        </div>
    );
}

function PhotosStep({ profile, update, errors, addToast }: StepProps) {
    const categories = useMemo(() => [...new Set(profile.galleryImages.map(g => g.category))], [profile.galleryImages]);
    const listId = useId();

    return (
        <div className="space-y-4">
            <div className={card}>
                <div>
                    <h3 className="font-semibold text-sm text-gray-900">Homepage slideshow</h3>
                    <p className="text-xs text-gray-500">The first photo is what guests see first — make it the best one.</p>
                </div>
                {errors.heroImages && <p className="text-xs text-red-600">{errors.heroImages}</p>}
                {profile.heroImages.map((img, i) => {
                    const e = (f: string) => errors[`heroImages.${i}.${f}`];
                    const set = (patch: Partial<typeof img>) =>
                        update(p => ({ ...p, heroImages: p.heroImages.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
                    return (
                        <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-500">Slide {i + 1}</span>
                                <ListControls index={i} length={profile.heroImages.length} label={`slide ${i + 1}`}
                                    onMove={to => update(p => ({ ...p, heroImages: move(p.heroImages, i, to) }))}
                                    onRemove={() => update(p => ({ ...p, heroImages: p.heroImages.filter((_, j) => j !== i) }))} />
                            </div>
                            <PhotoField label="Photo" value={img.src} onChange={src => set({ src })} error={e("src")} addToast={addToast} />
                            <div className="grid sm:grid-cols-2 gap-3">
                                <TextInput label="Description" value={img.alt} onChange={alt => set({ alt })} error={e("alt")}
                                    hint="What the photo shows, for screen readers" />
                                <TextInput label="Photo credit (optional)" value={img.attribution ?? ""}
                                    onChange={v => set({ attribution: v || undefined })} error={e("attribution")} />
                            </div>
                        </div>
                    );
                })}
                <button type="button" onClick={() => update(p => ({ ...p, heroImages: [...p.heroImages, { src: "", alt: "" }] }))}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-gold hover:text-yellow-600">
                    <Plus className="w-3.5 h-3.5" /> Add a slide
                </button>
            </div>

            <div className={card}>
                <div>
                    <h3 className="font-semibold text-sm text-gray-900">Gallery</h3>
                    <p className="text-xs text-gray-500">Grouped by category on the gallery page, in this order.</p>
                </div>
                <datalist id={listId}>{categories.map(c => <option key={c} value={c} />)}</datalist>
                {profile.galleryImages.map((img, i) => {
                    const e = (f: string) => errors[`galleryImages.${i}.${f}`];
                    const set = (patch: Partial<typeof img>) =>
                        update(p => ({ ...p, galleryImages: p.galleryImages.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
                    return (
                        <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-500">Photo {i + 1}</span>
                                <ListControls index={i} length={profile.galleryImages.length} label={`photo ${i + 1}`}
                                    onMove={to => update(p => ({ ...p, galleryImages: move(p.galleryImages, i, to) }))}
                                    onRemove={() => update(p => ({ ...p, galleryImages: p.galleryImages.filter((_, j) => j !== i) }))} />
                            </div>
                            <PhotoField label="Photo" value={img.src} onChange={src => set({ src })} error={e("src")} addToast={addToast} />
                            <div className="grid sm:grid-cols-2 gap-3">
                                <TextInput label="Description" value={img.alt} onChange={alt => set({ alt })} error={e("alt")} />
                                <Field label="Category" error={e("category")}>
                                    {props => <input {...props} list={listId} value={img.category} onChange={ev => set({ category: ev.target.value })} className={input} />}
                                </Field>
                            </div>
                        </div>
                    );
                })}
                <button type="button"
                    onClick={() => update(p => ({ ...p, galleryImages: [...p.galleryImages, { src: "", alt: "", category: categories[0] ?? "" }] }))}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-gold hover:text-yellow-600">
                    <Plus className="w-3.5 h-3.5" /> Add a photo
                </button>
            </div>
        </div>
    );
}

function PermitsStep({ profile, update, errors }: StepProps) {
    const setPermit = (key: keyof PropertyProfile["permits"]) => (v: string) =>
        update(p => ({ ...p, permits: { ...p.permits, [key]: v } }));
    const set = (key: "title" | "description" | "roomsDescription" | "ogImageAlt") => (v: string) => update(p => ({ ...p, [key]: v }));

    return (
        <div className="space-y-4">
            <div className={card}>
                <h3 className="font-semibold text-sm text-gray-900">Permits and licences</h3>
                <p className="text-xs text-gray-500">
                    Most counties require these before you take bookings. The short-term rental permit number
                    is shown in the site’s footer once entered.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                    <TextInput label="Short-term rental permit" value={profile.permits.strPermit} onChange={setPermit("strPermit")} error={errors["permits.strPermit"]} />
                    <TextInput label="Occupancy tax (TOT) certificate" value={profile.permits.totCertificate} onChange={setPermit("totCertificate")} error={errors["permits.totCertificate"]} />
                    <TextInput label="Business licence" value={profile.permits.businessLicense} onChange={setPermit("businessLicense")} error={errors["permits.businessLicense"]} />
                </div>
            </div>

            <div className={card}>
                <h3 className="font-semibold text-sm text-gray-900">Search results and link previews</h3>
                <TextInput label="Page title" value={profile.title} onChange={set("title")} error={errors.title}
                    hint={`${profile.title.length}/60 characters shown by Google`} />
                <TextArea label="Description" value={profile.description} onChange={set("description")} error={errors.description}
                    hint={`${profile.description.length}/155 characters shown by Google`} />
                <TextArea label="Rooms page description" value={profile.roomsDescription} onChange={set("roomsDescription")} error={errors.roomsDescription} rows={2} />
                <TextInput label="Preview image description" value={profile.ogImageAlt} onChange={set("ogImageAlt")} error={errors.ogImageAlt}
                    hint="Describes the picture shown when the site is shared" />
            </div>
        </div>
    );
}

function ReviewStep({ profile, errors, roomRates, onJump }: StepProps & {
    roomRates: Record<string, Partial<RoomRate>>; onJump: (step: StepId) => void;
}) {
    const missingRates = profile.rooms.filter(r => {
        const rate = roomRates[r.slug];
        return r.bookable && (rate?.weekdayPrice === undefined || rate?.weekendPrice === undefined || rate?.maxGuests === undefined);
    });

    const checks: { ok: boolean; label: string; step: StepId; required: boolean }[] = [
        ...STEPS.filter(s => s.id !== "review").map(s => ({
            ok: stepErrors(errors, s).length === 0,
            label: `${s.label} complete`,
            step: s.id,
            required: true,
        })),
        { ok: missingRates.length === 0, label: missingRates.length ? `Prices for ${missingRates.map(r => r.title || r.slug).join(", ")}` : "Room prices set", step: "rooms", required: true },
        { ok: Boolean(profile.permits.strPermit), label: "Short-term rental permit entered", step: "permits", required: false },
        { ok: Boolean(profile.permits.totCertificate), label: "Occupancy tax certificate entered", step: "permits", required: false },
        { ok: profile.galleryImages.length > 0, label: "Gallery has photos", step: "photos", required: false },
    ];

    return (
        <div className={card}>
            <h3 className="font-semibold text-sm text-gray-900">Ready to go?</h3>
            <p className="text-xs text-gray-500">
                Items marked “recommended” don’t block finishing, but you’ll need permits before taking bookings in most counties.
            </p>
            <ul className="divide-y divide-gray-100">
                {checks.map(c => (
                    <li key={c.label} className="flex items-center gap-3 py-2.5">
                        <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${c.ok ? "bg-emerald-100 text-emerald-700" : c.required ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                            aria-hidden>
                            {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </span>
                        <span className="flex-1 text-sm text-gray-700">
                            {c.label}
                            {(c.ok || c.required) && <span className="sr-only">{c.ok ? " — done" : " — required"}</span>}
                            {!c.ok && !c.required && <span className="ml-2 text-xs text-amber-700">recommended</span>}
                        </span>
                        {!c.ok && (
                            <button type="button" onClick={() => onJump(c.step)} className="text-xs font-semibold text-brand-gold hover:text-yellow-600">
                                Fix
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Wizard ────────────────────────────────────────────────────────────────────

export function PropertySetup({ addToast }: { addToast: AddToast }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [profile, setProfile] = useState<PropertyProfile | null>(null);
    const [roomRates, setRoomRates] = useState<Record<string, Partial<RoomRate>>>({});
    const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set());
    const [completedAt, setCompletedAt] = useState<string | null>(null);
    const [step, setStep] = useState<StepId>("basics");
    const [showErrors, setShowErrors] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);

    const load = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await fetch("/api/admin/property");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not load the property");
            setProfile(data.profile);
            setRoomRates(data.roomRates);
            setSavedSlugs(new Set(data.profile.rooms.map((r: ProfileRoom) => r.slug)));
            setCompletedAt(data.onboardingCompletedAt);
            setDirty(false);
        } catch (err: any) {
            setLoadError(err?.message || "Could not load the property");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Warn before closing the tab with unsaved changes.
    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const errors = useMemo(() => (profile ? validate(profile) : {}), [profile]);

    if (loading) {
        return <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" aria-label="Loading" /></div>;
    }
    if (loadError || !profile) {
        return (
            <div className={card}>
                <p className="text-sm text-red-600">{loadError}</p>
                <button onClick={load} className="text-xs font-semibold text-brand-gold">Try again</button>
            </div>
        );
    }

    const update = (fn: (p: PropertyProfile) => PropertyProfile) => {
        setProfile(p => (p ? fn(p) : p));
        setDirty(true);
    };
    const setRates: typeof setRoomRates = value => { setRoomRates(value); setDirty(true); };

    const index = STEPS.findIndex(s => s.id === step);
    const current = STEPS[index];
    const visibleErrors = showErrors ? errors : {};

    const goTo = (id: StepId) => {
        setStep(id);
        setShowErrors(false);
        requestAnimationFrame(() => headingRef.current?.focus());
    };

    const completeRates = (): Record<string, RoomRate> | string => {
        const out: Record<string, RoomRate> = {};
        for (const room of profile.rooms.filter(r => r.bookable)) {
            const r = roomRates[room.slug];
            if (r?.weekdayPrice === undefined || r.weekendPrice === undefined || r.maxGuests === undefined) {
                if (savedSlugs.has(room.slug) && !r) continue;
                return `Set prices and capacity for ${room.title || "the new room"}`;
            }
            out[room.slug] = { weekdayPrice: r.weekdayPrice, weekendPrice: r.weekendPrice, maxGuests: r.maxGuests, isActive: r.isActive ?? true };
        }
        return out;
    };

    const save = async ({ next, finish }: { next?: StepId; finish?: boolean }) => {
        if (Object.keys(errors).length > 0) {
            setShowErrors(true);
            const firstBad = STEPS.find(s => stepErrors(errors, s).length > 0);
            if (firstBad && firstBad.id !== step) {
                addToast(`Fix the highlighted fields in ${firstBad.label} first`, "error");
                goTo(firstBad.id);
                setShowErrors(true);
            } else {
                addToast("Fix the highlighted fields first", "error");
            }
            return;
        }
        const rates = completeRates();
        if (typeof rates === "string") {
            addToast(rates, "error");
            goTo("rooms");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/admin/property", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profile, roomRates: rates, completeOnboarding: finish || undefined }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Save failed");

            setDirty(false);
            setSavedSlugs(new Set(profile.rooms.map(r => r.slug)));
            if (finish) setCompletedAt(new Date().toISOString());
            addToast(finish ? "Setup complete — your site is updated" : "Saved", "success");
            // Re-render the server layout so the rest of the admin sees the new values.
            router.refresh();
            if (next) goTo(next);
        } catch (err: any) {
            addToast(err?.message || "Save failed", "error");
        } finally {
            setSaving(false);
        }
    };

    const stepProps: StepProps = { profile, update, errors: visibleErrors, addToast };
    const nextStep = STEPS[index + 1]?.id;

    return (
        <div className="space-y-4">
            <div className={card}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="font-semibold text-gray-900">Property setup</h2>
                        <p className="text-xs text-gray-500">
                            {completedAt
                                ? "Setup is complete. Changes here update the site within a minute."
                                : "Tell guests about your place. You can save and come back at any step."}
                        </p>
                    </div>
                    {dirty && <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">Unsaved changes</span>}
                </div>

                <nav aria-label="Setup steps">
                    <ol className="flex flex-wrap gap-1.5">
                        {STEPS.map((s, i) => {
                            const hasErrors = stepErrors(errors, s).length > 0;
                            const active = s.id === step;
                            return (
                                <li key={s.id}>
                                    <button type="button" onClick={() => goTo(s.id)} aria-current={active ? "step" : undefined}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                            active ? "bg-brand-gold text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}>
                                        <span aria-hidden>{i + 1}.</span>
                                        <s.Icon className="w-3.5 h-3.5" />
                                        {s.label}
                                        {hasErrors && <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-label="has problems" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            </div>

            <h3 ref={headingRef} tabIndex={-1} className="sr-only">{current.label}</h3>

            {step === "basics" && <BasicsStep {...stepProps} />}
            {step === "stay" && <StayStep {...stepProps} />}
            {step === "rooms" && <RoomsStep {...stepProps} roomRates={roomRates} setRoomRates={setRates} savedSlugs={savedSlugs} />}
            {step === "photos" && <PhotosStep {...stepProps} />}
            {step === "permits" && <PermitsStep {...stepProps} />}
            {step === "review" && <ReviewStep {...stepProps} errors={errors} roomRates={roomRates} onJump={goTo} />}

            <div className="flex items-center justify-between gap-3 sticky bottom-20 md:bottom-4 bg-gray-50/90 backdrop-blur py-2">
                <button type="button" onClick={() => index > 0 && goTo(STEPS[index - 1].id)} disabled={index === 0}
                    className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-white disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" /> Back
                </button>
                {step === "review" ? (
                    <button type="button" onClick={() => save({ finish: true })} disabled={saving}
                        className="flex items-center gap-2 bg-brand-gold text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {completedAt ? "Save" : "Finish setup"}
                    </button>
                ) : (
                    <button type="button" onClick={() => save({ next: nextStep })} disabled={saving}
                        className="flex items-center gap-2 bg-brand-gold text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Save and continue <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

