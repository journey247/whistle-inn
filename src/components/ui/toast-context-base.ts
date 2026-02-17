// Shared context and types for Toasts (no "use client" here so this file only exports values)
import { createContext } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

export interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
