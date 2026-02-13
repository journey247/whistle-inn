"use client";
import { motion } from "framer-motion";

export function RevenueChart({ data }: { data: number[] }) {
    // Generate some mock data if current is empty or just one point to show a curve
    const chartData = data.length > 0 ? data : [65, 59, 80, 81, 56, 55, 40, 70, 45, 90, 85, 100];
    const max = Math.max(...chartData);

    return (
        <div className="h-full w-full flex items-end justify-between gap-2 pt-4">
            {chartData.map((value, index) => (
                <div key={index} className="relative flex-1 group h-full flex flex-col justify-end">
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(value / max) * 100}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className="w-full bg-blue-100 rounded-t-sm group-hover:bg-blue-200 transition-colors relative"
                    >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-xs px-2 py-1 rounded transition-opacity">
                            ${value * 10}
                        </div>
                    </motion.div>
                </div>
            ))}
        </div>
    );
}
