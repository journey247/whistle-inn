// src/components/content/ContentProvider.tsx
"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Edit2, Save, X, RotateCcw } from 'lucide-react';
import { useToast } from "@/components/ui/toast-context";

interface ContentContextType {
    content: Record<string, string>;
    isEditMode: boolean;
    isAdmin: boolean;
    toggleEditMode: () => void;
    updateContent: (key: string, value: string) => Promise<void>;
    saving: boolean;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function useContent() {
    const context = useContext(ContentContext);
    if (!context) {
        throw new Error('useContent must be used within a ContentProvider');
    }
    return context;
}

interface ContentProviderProps {
    initialContent: Record<string, string>;
    children: React.ReactNode;
}

export function ContentProvider({ initialContent, children }: ContentProviderProps) {
    const [content, setContent] = useState<Record<string, string>>(initialContent || {});
    const [isEditMode, setIsEditMode] = useState(false);
    const { isAdmin } = useAdminAuth();
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    // Sync initial content if provided from server wrapper
    useEffect(() => {
        if (initialContent) {
            setContent(prev => ({ ...prev, ...initialContent }));
        }
    }, [initialContent]);

    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
    };

    const updateContent = async (key: string, value: string) => {
        setSaving(true);
        try {
            // Optimistic update
            setContent(prev => ({ ...prev, [key]: value }));

            const token = localStorage.getItem('admin_token');
            if (!token) throw new Error("Not authenticated");

            // For now we assume label/section are implicitly handled by the backend or preserved
            // In a robust implementation, we'd fetch the block metadata first or allow editing it too.
            // Here we just update the value.
            const res = await fetch('/api/admin/content', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ key, value })
            });

            if (!res.ok) {
                throw new Error("Failed to save");
            }

            addToast("Content saved!", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed to save content", "error");
            // Revert could be implemented here if we store previous state
        } finally {
            setSaving(false);
        }
    };

    return (
        <ContentContext.Provider value={{ content, isEditMode, isAdmin, toggleEditMode, updateContent, saving }}>
            {children}

            {/* Context-aware UI elements (like floating toggle) */}
            {isAdmin && (
                <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
                    <button
                        onClick={toggleEditMode}
                        className={`p-4 rounded-full shadow-xl transition-all ${isEditMode
                                ? 'bg-red-500 text-white hover:bg-red-600 rotate-0'
                                : 'bg-brand-gold text-white hover:bg-yellow-600'
                            }`}
                        title={isEditMode ? "Exit Edit Mode" : "Edit Page Content"}
                    >
                        {isEditMode ? <X size={24} /> : <Edit2 size={24} />}
                    </button>
                    {isEditMode && (
                        <div className="bg-black/80 text-white text-xs py-1 px-3 rounded-full text-center backdrop-blur-sm">
                            Edit Mode Active
                        </div>
                    )}
                </div>
            )}
        </ContentContext.Provider>
    );
}
