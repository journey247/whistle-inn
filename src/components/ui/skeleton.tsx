"use client";

import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={clsx(
                "animate-pulse rounded-md bg-slate-200",
                className
            )}
        />
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                ))}
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
    );
}