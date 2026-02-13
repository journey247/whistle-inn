"use client";

import { useState, useEffect } from "react";
import { Loader2, Trash, Plus, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function PricingPanel() {
    const [rates, setRates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        label: "",
        startDate: "",
        endDate: "",
        type: "MULTIPLIER", // MULTIPLIER or FIXED
        value: ""
    });

    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        try {
            const res = await fetch('/api/admin/rates');
            if (res.ok) setRates(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        const payload: any = {
            label: formData.label,
            startDate: formData.startDate,
            endDate: formData.endDate,
        };

        if (formData.type === 'MULTIPLIER') {
            payload.multiplier = formData.value;
        } else {
            payload.pricePerNight = formData.value;
        }

        try {
            const res = await fetch('/api/admin/rates', {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setFormData({
                    label: "",
                    startDate: "",
                    endDate: "",
                    type: "MULTIPLIER",
                    value: ""
                });
                fetchRates();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create rate');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await fetch(`/api/admin/rates?id=${id}`, { method: 'DELETE' });
            fetchRates();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Add Seasonal Rate
                </h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                        <input
                            required
                            className="w-full p-2 border rounded-lg"
                            value={formData.label}
                            onChange={e => setFormData({ ...formData, label: e.target.value })}
                            placeholder="e.g. Peak Season 2024"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                        <input
                            required
                            type="date"
                            className="w-full p-2 border rounded-lg"
                            value={formData.startDate}
                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                        <input
                            required
                            type="date"
                            className="w-full p-2 border rounded-lg"
                            value={formData.endDate}
                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pricing Type</label>
                        <select
                            className="w-full p-2 border rounded-lg"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="MULTIPLIER">Multiplier (e.g. 1.5x)</option>
                            <option value="FIXED">Fixed Price ($/night)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            className="w-full p-2 border rounded-lg"
                            value={formData.value}
                            onChange={e => setFormData({ ...formData, value: e.target.value })}
                            placeholder={formData.type === 'MULTIPLIER' ? '1.5' : '450.00'}
                        />
                    </div>
                    
                    <div className="md:col-span-2">
                        <button type="submit" disabled={loading} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50">
                            Add Rate
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5" /> Seasonal Rates
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                                <th className="px-6 py-3">Label</th>
                                <th className="px-6 py-3">Date Range</th>
                                <th className="px-6 py-3">Modification</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rates.map(rate => (
                                <tr key={rate.id} className="border-b hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold">{rate.label}</td>
                                    <td className="px-6 py-4">
                                        {format(new Date(rate.startDate), 'MMM d')} - {format(new Date(rate.endDate), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 font-mono">
                                        {rate.multiplier ? `${rate.multiplier}x` : `$${rate.pricePerNight}`}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleDelete(rate.id)}
                                            className="text-red-600 hover:text-red-900 p-2"
                                            title="Delete"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {rates.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        No special rates found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
