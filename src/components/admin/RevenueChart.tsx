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
    const maxRevenue = Math.max(...data.map(d => d.revenue));

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Revenue Chart</h3>
            <div className="h-64 flex items-end justify-between">
                {data.map((item, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <div
                            className="bg-blue-500 w-8 rounded-t"
                            style={{ height: `${(item.revenue / maxRevenue) * 200}px` }}
                        ></div>
                        <span className="text-xs mt-2">{item.month}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}