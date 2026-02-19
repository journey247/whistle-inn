"use client";

import React from 'react';

interface RevenueData {
    month: string;
    revenue: number;
}

interface RevenueChartProps {
    data: RevenueData[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    const hasData = data.length > 0 && data.some(d => d.revenue > 0);
    const maxRevenue = hasData ? Math.max(...data.map(d => d.revenue)) : 1;

    if (!hasData) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <div className="flex items-end gap-1 mb-4 opacity-30">
                    {[40, 70, 50, 90, 60, 80].map((h, i) => (
                        <div key={i} className="w-6 bg-slate-300 rounded-t" style={{ height: `${h}px` }} />
                    ))}
                </div>
                <p className="text-sm">No revenue data yet</p>
                <p className="text-xs mt-1">Data will appear here as bookings are confirmed</p>
            </div>
        );
    }

    return (
        <div className="h-64 flex items-end gap-1 md:gap-2 px-2">
            {data.map((item, index) => {
                const barHeight = maxRevenue > 0 ? Math.max(4, (item.revenue / maxRevenue) * 200) : 4;
                return (
                    <div key={index} className="flex flex-col items-center flex-1 group relative">
                        {/* Tooltip */}
                        {item.revenue > 0 && (
                            <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                ${item.revenue.toLocaleString()}
                            </div>
                        )}
                        <div
                            className={`w-full rounded-t transition-all duration-300 ${item.revenue > 0 ? 'bg-brand-gold hover:bg-yellow-500' : 'bg-slate-100'}`}
                            style={{ height: `${barHeight}px` }}
                        />
                        <span className="text-xs text-slate-500 mt-2 truncate w-full text-center">{item.month}</span>
                    </div>
                );
            })}
        </div>
    );
}
