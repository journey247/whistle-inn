"use client";

import { useState, useEffect } from "react";
import { Loader2, Trash, Plus, Tag } from "lucide-react";
import { format } from "date-fns";

export default function CouponsPanel() {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        code: "",
        discountType: "PERCENT",
        discountValue: "",
        validUntil: "",
        maxUses: ""
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const res = await fetch('/api/admin/coupons');
            if (res.ok) setCoupons(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/admin/coupons', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setFormData({
                    code: "",
                    discountType: "PERCENT",
                    discountValue: "",
                    validUntil: "",
                    maxUses: ""
                });
                fetchCoupons();
            } else {
                alert('Failed to create coupon');
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
            await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
            fetchCoupons();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Create Coupon
                </h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                        <input
                            required
                            className="w-full p-2 border rounded-lg uppercase"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            placeholder="SUMMER2024"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                            <select
                                className="w-full p-2 border rounded-lg"
                                value={formData.discountType}
                                onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                            >
                                <option value="PERCENT">Percent (%)</option>
                                <option value="FIXED">Fixed Amount ($)</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                className="w-full p-2 border rounded-lg"
                                value={formData.discountValue}
                                onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                                placeholder={formData.discountType === 'PERCENT' ? '15' : '50.00'}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Expires (Optional)</label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded-lg"
                            value={formData.validUntil}
                            onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses (Optional)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded-lg"
                            value={formData.maxUses}
                            onChange={e => setFormData({ ...formData, maxUses: e.target.value })}
                            placeholder="Unlimited"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <button type="submit" disabled={loading} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50">
                            Create Coupon
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Tag className="w-5 h-5" /> Active Coupons
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                                <th className="px-6 py-3">Code</th>
                                <th className="px-6 py-3">Discount</th>
                                <th className="px-6 py-3">Usage</th>
                                <th className="px-6 py-3">Expires</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.map(coupon => (
                                <tr key={coupon.id} className="border-b hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold font-mono">{coupon.code}</td>
                                    <td className="px-6 py-4">
                                        {coupon.discountType === 'PERCENT' ? `${coupon.value}%` : `$${coupon.value}`}
                                    </td>
                                    <td className="px-6 py-4">
                                        {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}
                                    </td>
                                    <td className="px-6 py-4">
                                        {coupon.validUntil ? format(new Date(coupon.validUntil), 'MMM d, yyyy') : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleDelete(coupon.id)}
                                            className="text-red-600 hover:text-red-900 p-2"
                                            title="Delete"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {coupons.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No coupons found
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
