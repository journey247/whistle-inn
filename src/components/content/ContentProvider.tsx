"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from "@/components/ui/toast-context";

type ContentMap = Record<string, string>;

interface ContentContextType {
    content: ContentMap;
    isEditMode: boolean;
    isAdmin: boolean;
    toggleEditMode: () => void;
    updateContent: (key: string, value: string) => Promise<void>;
    saving: boolean;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

interface ContentProviderProps {
    initialContent?: ContentMap;
    children: ReactNode;
}

// Simple Admin Auth Hook if not existing
const useAdminAuthInternal = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) setIsAdmin(true); // Basic check, real verify happens on server
    }, []);
    return { isAdmin };
};

export function ContentProvider({ initialContent, children }: ContentProviderProps) {
    const [content, setContent] = useState<ContentMap>(initialContent || {});
    const [isEditMode, setIsEditMode] = useState(false);
    const { isAdmin } = useAdminAuthInternal();
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (initialContent) {
            setContent(prev => ({ ...prev, ...initialContent }));
        }
    }, [initialContent]);

    const toggleEditMode = () => setIsEditMode(!isEditMode);

    const updateContent = async (key: string, value: string) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) throw new Error("Not authenticated");

            const res = await fetch('/api/admin/content', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ key, value })
            });

            if (!res.ok) throw new Error("Failed to save");

            setContent(prev => ({ ...prev, [key]: value }));
            addToast("Content saved", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed to save", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ContentContext.Provider value={{ content, isEditMode, isAdmin, toggleEditMode, updateContent, saving }}>
            {children}
        </ContentContext.Provider>
    );
}

export const useContent = () => {
    const context = useContext(ContentContext);
    if (!context) throw new Error("useContent must be used within ContentProvider");
    return context;
};
