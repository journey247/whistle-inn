"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Trash2, Plus, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface SpecialRate {
    id: string;
    startDate: string;
    endDate: string;
    price: number;
    minStay: number;
    note?: string;
}

export function PricingPanel() {
    const [rates, setRates] = useState<SpecialRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [baseWeekday, setBaseWeekday] = useState<string>('');
    const [baseWeekend, setBaseWeekend] = useState<string>('');
    const [cleaningFee, setCleaningFee] = useState<string>('');
    const [minimumNights, setMinimumNights] = useState<string>('');
    const [savingBase, setSavingBase] = useState(false);
    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        const t = localStorage.getItem('adminToken');
        setToken(t);
        fetchRates(t);
        fetchBasePricing(t);
    }, []);

    const fetchRates = async (authToken?: string | null) => {
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
            const res = await fetch('/api/admin/pricing', { headers });
            if (!res.ok) {
                throw new Error('Failed to fetch rates');
            }
            const data = await res.json();
            setRates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch rates:', error);
            setRates([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchBasePricing = async (authToken?: string | null) => {
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
            const res = await fetch('/api/admin/content', { headers });
            if (!res.ok) throw new Error('Failed to fetch content');
            const blocks = await res.json();
            const weekday = blocks.find((b: any) => b.key === 'base_weekday_price');
            const weekend = blocks.find((b: any) => b.key === 'base_weekend_price');
            const cleaning = blocks.find((b: any) => b.key === 'cleaning_fee');
            const minNights = blocks.find((b: any) => b.key === 'minimum_nights');
            setBaseWeekday(weekday?.value || '');
            setBaseWeekend(weekend?.value || '');
            setCleaningFee(cleaning?.value || '');
            setMinimumNights(minNights?.value || '');
        } catch (error) {
            console.error('Failed to fetch base pricing:', error);
        }
    };

    const onSubmit = async (data: any) => {
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch('/api/admin/pricing', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ...data,
                    price: Number(data.price),
                    minStay: Number(data.minStay)
                })
            });
            if (res.ok) {
                reset();
                fetchRates(token);
            } else {
                alert('Failed to create rate. Check date overlap.');
            }
        } catch (error) {
            console.error('Create error:', error);
        }
    };

    const saveBasePricing = async () => {
        setSavingBase(true);
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const updates = [
                { key: 'base_weekday_price', value: String(baseWeekday), label: 'Base Weekday Price', section: 'Pricing' },
                { key: 'base_weekend_price', value: String(baseWeekend), label: 'Base Weekend Price', section: 'Pricing' },
                { key: 'cleaning_fee', value: String(cleaningFee), label: 'Cleaning Fee', section: 'Pricing' },
                { key: 'minimum_nights', value: String(minimumNights), label: 'Minimum Nights', section: 'Pricing' },
            ];

            // Save sequentially to ensure notifications and stripe triggers pick up correct values
            for (const u of updates) {
                await fetch('/api/admin/content', {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(u)
                });
            }

            // Refresh pricing and content
            fetchRates(token);
            fetchBasePricing(token);
            alert('Base pricing saved and Stripe update triggered.');
        } catch (error) {
            console.error('Failed to save base pricing:', error);
            alert('Failed to save base pricing');
        } finally {
            setSavingBase(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this special rate?')) return;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            await fetch(`/api/admin/pricing?id=${id}`, { method: 'DELETE', headers });
            fetchRates(token);
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-brand-gold" /> Base Rates & Fees
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Base Weekday Price</label>
                        <input
                            type="number"
                            value={baseWeekday}
                            onChange={(e) => setBaseWeekday(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Base Weekend Price</label>
                        <input
                            type="number"
                            value={baseWeekend}
                            onChange={(e) => setBaseWeekend(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Cleaning Fee</label>
                        <input
                            type="number"
                            value={cleaningFee}
                            onChange={(e) => setCleaningFee(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Minimum Nights</label>
                        <input
                            type="number"
                            value={minimumNights}
                            onChange={(e) => setMinimumNights(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <button onClick={saveBasePricing} disabled={savingBase} className="bg-brand-gold text-white px-4 py-2 rounded-lg">
                        {savingBase ? 'Saving...' : 'Save Base Rates & Update Stripe'}
                    </button>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-brand-gold" /> Add Special Rate
                </h3>
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Start Date</label>
                        <input
                            type="date"
                            {...register("startDate", { required: true })}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">End Date</label>
                        <input
                            type="date"
                            {...register("endDate", { required: true })}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Price / Night</label>
                        <input
                            type="number"
                            {...register("price", { required: true, min: 0 })}
                            placeholder="350"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Min Stay</label>
                        <input
                            type="number"
                            {...register("minStay", { required: true, min: 1 })}
                            defaultValue={3}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <button type="submit" className="bg-brand-gold text-white p-2 rounded-lg font-bold hover:bg-yellow-600 transition-colors shadow-md">
                        Add Rate
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-200">
                        <tr>
                            <th className="p-4">Date Range</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Min Stay</th>
                            <th className="p-4">Note</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {Array.isArray(rates) && rates.map((rate) => (
                            <tr key={rate.id} className="hover:bg-slate-50">
                                <td className="p-4 font-mono text-slate-800">
                                    {format(new Date(rate.startDate), 'MMM dd')} - {format(new Date(rate.endDate), 'MMM dd, yyyy')}
                                </td>
                                <td className="p-4 font-bold text-green-700">${rate.price}</td>
                                <td className="p-4 text-slate-600">{rate.minStay} nights</td>
                                <td className="p-4 text-slate-500 italic">{rate.note || '-'}</td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => handleDelete(rate.id)}
                                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {(!Array.isArray(rates) || rates.length === 0) && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500 italic">No special rates configured. Standard base rate applies.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

