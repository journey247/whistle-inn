"use client";
import React, { useState, useEffect, useCallback } from "react";
import { getAdminToken } from "@/lib/adminToken";
import { Landmark, Save, RefreshCw } from "lucide-react";
import { DEFAULT_TAX_SETTINGS, TAX_SETTING_KEYS, parseTaxSettings, type TaxSettings } from "@/lib/tax";

type AddToast = (msg: string, type?: "success" | "error" | "info") => void;

type ReportRow = {
    month: string;
    bookings: number;
    nights: number;
    grossReceipts: number;
    exemptReceipts: number;
    taxableAmount: number;
    occupancyTax: number;
    assessmentTax: number;
    untaxedBookings: number;
};

type Report = { year: number; quarter: number; months: ReportRow[]; totals: Omit<ReportRow, "month"> };

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold";

/**
 * Occupancy tax settings and the quarterly TOT report.
 *
 * Rates are stored as ContentBlocks like the other pricing settings and read
 * by the server-side quote, so the guest is charged exactly what is shown here.
 */
export function TaxSettingsCard({ addToast }: { addToast: AddToast }) {
    const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
    const [report, setReport] = useState<Report | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

    const h = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken() ?? ""}` }), []);

    useEffect(() => {
        fetch("/api/admin/content", { headers: h() })
            .then(r => r.json())
            .then(content => {
                if (Array.isArray(content)) {
                    setSettings(parseTaxSettings(Object.fromEntries(content.map((c: any) => [c.key, c.value]))));
                }
            })
            .catch(() => addToast("Failed to load tax settings", "error"))
            .finally(() => setLoading(false));
    }, [h, addToast]);

    useEffect(() => {
        setReportLoading(true);
        fetch(`/api/admin/tax-report?year=${year}&quarter=${quarter}`, { headers: h() })
            .then(r => r.json())
            .then(data => setReport(data.error ? null : data))
            .catch(() => setReport(null))
            .finally(() => setReportLoading(false));
    }, [h, year, quarter]);

    const save = async (next: TaxSettings) => {
        setSaving(true);
        try {
            const fields: [string, string, string][] = [
                [TAX_SETTING_KEYS.enabled, String(next.enabled), "Charge occupancy tax"],
                [TAX_SETTING_KEYS.totRate, String(next.totRate), "TOT rate (%)"],
                [TAX_SETTING_KEYS.assessmentRate, String(next.assessmentRate), "Tourism assessment rate (%)"],
                [TAX_SETTING_KEYS.assessmentLabel, next.assessmentLabel, "Tourism assessment name"],
                [TAX_SETTING_KEYS.cleaningFeeTaxable, String(next.cleaningFeeTaxable), "Cleaning fee is taxable"],
                [TAX_SETTING_KEYS.exemptNights, String(next.exemptNights), "Tax-exempt stay length (nights)"],
            ];
            const results = await Promise.all(fields.map(([key, value, label]) =>
                fetch("/api/admin/content", {
                    method: "PUT", headers: h(),
                    body: JSON.stringify({ key, value, label, type: "text", section: "tax", category: "pricing" }),
                })
            ));
            if (results.some(r => !r.ok)) throw new Error("save failed");
            setSettings(next);
            addToast(next.enabled ? "Tax settings saved — guests are now charged occupancy tax" : "Tax settings saved", "success");
        } catch {
            addToast("Failed to save tax settings", "error");
        } finally {
            setSaving(false);
        }
    };

    const onSave = () => {
        if (settings.enabled) {
            const pct = settings.totRate + settings.assessmentRate;
            if (!window.confirm(`Guests will be charged ${pct}% occupancy tax on top of your current prices. Continue?`)) return;
        }
        save(settings);
    };

    if (loading) return <div className="flex justify-center py-6"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

    const t = report?.totals;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-sm text-gray-900">Occupancy Tax</h3>
            </div>
            <p className="text-xs text-gray-500">
                For bookings made on this site. Airbnb and VRBO collect tax on their own bookings.
                Defaults are for unincorporated Placer County (8% TOT) — check them against your TOT return.
            </p>

            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.enabled}
                    onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))}
                    className="w-4 h-4 accent-brand-gold" />
                <span className="text-sm font-medium text-gray-800">Charge occupancy tax at checkout</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="tax-tot" className="block text-xs text-gray-500 mb-1">TOT rate (%)</label>
                    <input id="tax-tot" type="number" step="0.01" min="0" max="50" value={settings.totRate}
                        onChange={e => setSettings(s => ({ ...s, totRate: Number(e.target.value) }))} className={inputCls} />
                </div>
                <div>
                    <label htmlFor="tax-exempt" className="block text-xs text-gray-500 mb-1">Exempt at (nights)</label>
                    <input id="tax-exempt" type="number" min="0" value={settings.exemptNights}
                        onChange={e => setSettings(s => ({ ...s, exemptNights: Number(e.target.value) }))} className={inputCls} />
                </div>
                <div>
                    <label htmlFor="tax-assess" className="block text-xs text-gray-500 mb-1">Tourism assessment (%)</label>
                    <input id="tax-assess" type="number" step="0.01" min="0" max="50" value={settings.assessmentRate}
                        onChange={e => setSettings(s => ({ ...s, assessmentRate: Number(e.target.value) }))} className={inputCls} />
                </div>
                <div>
                    <label htmlFor="tax-assess-label" className="block text-xs text-gray-500 mb-1">Assessment name</label>
                    <input id="tax-assess-label" type="text" value={settings.assessmentLabel}
                        onChange={e => setSettings(s => ({ ...s, assessmentLabel: e.target.value }))} className={inputCls} />
                </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.cleaningFeeTaxable}
                    onChange={e => setSettings(s => ({ ...s, cleaningFeeTaxable: e.target.checked }))}
                    className="w-4 h-4 accent-brand-gold" />
                <span className="text-sm text-gray-700">Cleaning fee is taxable</span>
            </label>

            <button onClick={onSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-brand-gold text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-500 transition disabled:opacity-50">
                {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Save Tax Settings</>}
            </button>

            {/* Quarterly report */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm text-gray-900">Quarterly TOT report</h4>
                    <div className="flex gap-2">
                        <label htmlFor="tax-q" className="sr-only">Quarter</label>
                        <select id="tax-q" value={quarter} onChange={e => setQuarter(Number(e.target.value))}
                            className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs">
                            {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                        </select>
                        <label htmlFor="tax-y" className="sr-only">Year</label>
                        <select id="tax-y" value={year} onChange={e => setYear(Number(e.target.value))}
                            className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs">
                            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                {reportLoading ? (
                    <div className="flex justify-center py-4"><RefreshCw className="w-4 h-4 animate-spin text-gray-400" /></div>
                ) : !report || !t ? (
                    <p className="text-sm text-gray-400 text-center py-3">Report unavailable</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-gray-500 text-left">
                                        <th className="py-1 pr-2 font-medium">Month</th>
                                        <th className="py-1 px-2 font-medium text-right">Gross rent</th>
                                        <th className="py-1 px-2 font-medium text-right">Exempt</th>
                                        <th className="py-1 px-2 font-medium text-right">Taxable</th>
                                        <th className="py-1 pl-2 font-medium text-right">Tax</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-800">
                                    {report.months.map(m => (
                                        <tr key={m.month} className="border-t border-gray-50">
                                            <td className="py-1.5 pr-2">{m.month}</td>
                                            <td className="py-1.5 px-2 text-right">{usd(m.grossReceipts)}</td>
                                            <td className="py-1.5 px-2 text-right">{usd(m.exemptReceipts)}</td>
                                            <td className="py-1.5 px-2 text-right">{usd(m.taxableAmount)}</td>
                                            <td className="py-1.5 pl-2 text-right">{usd(m.occupancyTax + m.assessmentTax)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t border-gray-200 font-semibold">
                                        <td className="py-1.5 pr-2">Q{report.quarter} total</td>
                                        <td className="py-1.5 px-2 text-right">{usd(t.grossReceipts)}</td>
                                        <td className="py-1.5 px-2 text-right">{usd(t.exemptReceipts)}</td>
                                        <td className="py-1.5 px-2 text-right">{usd(t.taxableAmount)}</td>
                                        <td className="py-1.5 pl-2 text-right">{usd(t.occupancyTax + t.assessmentTax)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-gray-500">
                            {t.bookings} paid direct booking{t.bookings !== 1 ? "s" : ""} · {t.nights} nights · by check-in date.
                            {t.assessmentTax > 0 && ` Includes ${usd(t.assessmentTax)} tourism assessment, filed separately.`}
                        </p>
                        {t.untaxedBookings > 0 && (
                            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                                {t.untaxedBookings} booking{t.untaxedBookings !== 1 ? "s were" : " was"} paid before tax collection was on.
                                Tax on {t.untaxedBookings !== 1 ? "those" : "that one"} may still be owed — check with your tax preparer.
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
