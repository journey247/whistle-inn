"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Tag, Trash2, Plus, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Coupon {
    id: string;
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    active: boolean;
    expiresAt?: string;
    maxUses?: number;
    usedCount: number;
}

export function CouponsPanel() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    useEffect(() => {
        const t = localStorage.getItem('admin_token');
        setToken(t);
        fetchCoupons(t);
    }, []);

    const fetchCoupons = async (authToken?: string | null) => {
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
            const res = await fetch('/api/admin/coupons', { headers });
            if (!res.ok) {
                throw new Error('Failed to fetch coupons');
            }
            const data = await res.json();
            setCoupons(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch coupons:', error);
            setCoupons([]);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: any) => {
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch('/api/admin/coupons', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ...data,
                    discountValue: Number(data.discountValue),
                    active: true
                })
            });
            if (res.ok) {
                reset();
                fetchCoupons(token);
            } else {
                alert('Failed to create coupon');
            }
        } catch (error) {
            console.error('Create error:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this coupon?')) return;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE', headers });
            fetchCoupons(token);
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-brand-gold" /> Create New Coupon
                </h3>
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Code</label>
                        <input
                            {...register("code", { required: true })}
                            placeholder="SUMMER2024"
                            className="w-full p-2 border border-gray-300 rounded-lg uppercase"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Type</label>
                        <select {...register("discountType")} className="w-full p-2 border border-gray-300 rounded-lg">
                            <option value="PERCENTAGE">Percentage (%)</option>
                            <option value="FIXED">Fixed Amount ($)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Value</label>
                        <input
                            type="number"
                            {...register("discountValue", { required: true, min: 1 })}
                            placeholder="10"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <button type="submit" className="bg-slate-900 text-white p-2 rounded-lg font-bold hover:bg-slate-800 transition-colors">
                        Create Coupon
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-200">
                        <tr>
                            <th className="p-4">Code</th>
                            <th className="p-4">Discount</th>
                            <th className="p-4">Uses</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {Array.isArray(coupons) && coupons.map((coupon) => (
                            <tr key={coupon.id} className="hover:bg-slate-50">
                                <td className="p-4 font-mono font-bold text-slate-800">{coupon.code}</td>
                                <td className="p-4">
                                    {coupon.discountType === 'PERCENTAGE'
                                        ? `${coupon.discountValue}% Off`
                                        : `$${coupon.discountValue} Off`}
                                </td>
                                <td className="p-4 text-slate-600">{coupon.usedCount} used</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {coupon.active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => handleDelete(coupon.id)}
                                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {(!Array.isArray(coupons) || coupons.length === 0) && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500 italic">No active coupons found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
