"use client";

export function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 h-32">
                        <div className="flex gap-4">
                            <Skeleton className="w-12 h-12 rounded-lg" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-64">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="h-full flex items-end gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                        <Skeleton key={j} className="flex-1 h-3/4" />
                    ))}
                </div>
            </div>
        </div>
    );
}
