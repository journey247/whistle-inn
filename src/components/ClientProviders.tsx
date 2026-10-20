"use client";

import React from 'react';
import { ToastProvider } from './ui/toast-context';
import { AttributionCapture } from './AttributionCapture';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <AttributionCapture />
            {children}
        </ToastProvider>
    );
}
